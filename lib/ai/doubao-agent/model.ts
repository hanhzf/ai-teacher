import { LanguageModelV1, LanguageModelV1CallOptions, LanguageModelV1Prompt, LanguageModelV1StreamPart } from "ai";
import { DOUBAO_MODEL_ID } from './constants';

// Doubao 模型实现 - 纯文本处理，但包含图片识别内容
function convertPromptToMessages(prompt: LanguageModelV1Prompt): Array<{role: string, content: string}> {
  return prompt.map((message) => {
    if (message.role === 'user' || message.role === 'assistant') {
      const content = message.content
        .map((content) => {
          if (content.type === 'text') {
            return content.text;
          } else if (content.type === 'image') {
            return '';
          }
          return '';
        })
        .filter(text => text.trim() !== '')
        .join(' ');
      return { role: message.role, content };
    } else if (message.role === 'system') {
      return { role: 'system', content: message.content };
    }
    return { role: 'user', content: '' };
  }).filter(msg => msg.content.trim() !== '');
}

export const doubaoModel: LanguageModelV1 = {
  specificationVersion: 'v1',
  provider: 'doubao',
  modelId: DOUBAO_MODEL_ID,
  defaultObjectGenerationMode: 'json',

  async doGenerate(options: LanguageModelV1CallOptions) {
    const { prompt } = options;
    
    // 调试：输出原始prompt结构
    // console.log('Doubao 原始prompt:', JSON.stringify(prompt, null, 2));
    
    const messages = convertPromptToMessages(prompt);

    // 调试：输出转换后的消息格式
    // console.log('Doubao 转换后的消息:', JSON.stringify(messages, null, 2));

    const baseUrl = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
    const apiKey = process.env.DOUBAO_API_KEY;
    
    if (!apiKey) {
      throw new Error('DOUBAO_API_KEY 环境变量未设置。请在 .env 文件中设置 DOUBAO_API_KEY。');
    }
    
    try {
      const requestBody = {
        model: DOUBAO_MODEL_ID,
        messages: messages,
        stream: false
      };
      
      const response = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage += ` - ${errorJson.error?.message || errorText}`;
        } catch {
          errorMessage += ` - ${errorText}`;
        }
        
        console.error('Doubao API 请求失败:', {
          url: baseUrl + '/chat/completions',
          status: response.status,
          model: DOUBAO_MODEL_ID,
          error: errorText
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      // console.log(text,'---doubao---title----')
      return {
        text,
        rawCall: {
          rawPrompt: prompt,
          rawSettings: {},
        },
        rawResponse: {
          headers: {},
        },
        request: {
          body: JSON.stringify({
            model: DOUBAO_MODEL_ID,
            messages: messages,
            stream: false
          }),
        },
        warnings: [],
        finishReason: 'stop',
        usage: { 
          promptTokens: data.usage?.prompt_tokens || 0, 
          completionTokens: data.usage?.completion_tokens || 0 
        }
      };
    } catch (error) {
      console.error('Doubao API error details:', error);
      throw new Error(`Doubao API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async doStream(options: LanguageModelV1CallOptions) {
    const { prompt } = options;
    
    // 调试：输出原始prompt结构
    // console.log('Doubao Stream 原始prompt:', JSON.stringify(prompt, null, 2));
    
    const messages = convertPromptToMessages(prompt);
    
    // 调试：输出转换后的消息格式
    // console.log('Doubao Stream 转换后的消息:', JSON.stringify(messages, null, 2));

    const baseUrl = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
    const apiKey = process.env.DOUBAO_API_KEY;

    if (!apiKey) {
      throw new Error('DOUBAO_API_KEY 环境变量未设置。请在 .env 文件中设置 DOUBAO_API_KEY。');
    }

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const requestBody = {
            model: DOUBAO_MODEL_ID,
            messages: messages,
            stream: true
          };
          
          const response = await fetch(baseUrl + '/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage += ` - ${errorJson.error?.message || errorText}`;
            } catch {
              errorMessage += ` - ${errorText}`;
            }
            
            console.error('Doubao API Stream 请求失败:', {
              url: baseUrl + '/chat/completions',
              status: response.status,
              model: DOUBAO_MODEL_ID,
              error: errorText
            });
            
            throw new Error(errorMessage);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No reader available');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue({
                    type: 'finish',
                    finishReason: 'stop',
                    logprobs: undefined,
                    usage: { promptTokens: 0, completionTokens: 0 },
                  });
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    controller.enqueue({
                      type: 'text-delta',
                      textDelta: delta,
                    });
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('Doubao Stream error details:', error);
          controller.error(error);
        }
      },
    });

    return {
      stream,
      rawCall: {
        rawPrompt: prompt,
        rawSettings: {},
      },
      request: {
        body: JSON.stringify({
          model: DOUBAO_MODEL_ID,
          messages: messages,
          stream: true
        }),
      },
      rawResponse: {
        headers: {},
      },
      warnings: [],
    };
  }
};
