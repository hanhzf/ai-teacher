import { LanguageModelV1, LanguageModelV1CallOptions, LanguageModelV1Prompt, LanguageModelV1StreamPart } from "ai";
import { QWEN_MODEL_ID } from './constants';

// Qwen 模型实现 - 参考 doubao-agent/model.ts 组织形式
function convertPromptToMessages(prompt: LanguageModelV1Prompt): Array<{role: string, content: string}> {
  return prompt.map((message) => {
    if (message.role === 'user' || message.role === 'assistant') {
      const content = message.content
        .map((contentPart: any) => {
          if (contentPart.type === 'text') {
            return contentPart.text;
          } else if (contentPart.type === 'image') {
            // 目前 Qwen 服务主要通过兼容模式 API 调用，暂不处理图片
            return '';
          }
          return '';
        })
        .filter((text: string) => text.trim() !== '')
        .join(' ');
      return { role: message.role, content };
    } else if (message.role === 'system') {
      return { role: 'system', content: message.content };
    }
    return { role: 'user', content: '' };
  }).filter((msg: {role: string, content: string}) => msg.content.trim() !== '');
}

export const qwenModel: LanguageModelV1 = {
  specificationVersion: 'v1',
  provider: 'qwen',
  modelId: QWEN_MODEL_ID,
  defaultObjectGenerationMode: 'json',

  async doGenerate(options: LanguageModelV1CallOptions) {
    const { prompt } = options;
    const messages = convertPromptToMessages(prompt);

    const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const apiKey = process.env.QWEN_API_KEY;
    
    console.log(`[Qwen] Initiating doGenerate for model: ${QWEN_MODEL_ID}`);
    console.log(`[Qwen] Base URL: ${baseUrl}`);
    
    if (!apiKey) {
      const errorMsg = 'QWEN_API_KEY 环境变量未设置。请在 .env 文件中设置 QWEN_API_KEY。';
      console.error(`[Qwen] Error: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    try {
      const requestBody = {
        model: QWEN_MODEL_ID,
        messages: messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 16384,
        top_p: 0.8,
      };
      
      console.log(`[Qwen] Request Body: ${JSON.stringify(requestBody, null, 2)}`);
      
      const response = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`[Qwen] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage += ` - ${errorJson.error?.message || errorText}`;
        } catch {
          errorMessage += ` - ${errorText}`;
        }
        
        console.error(`[Qwen] API Request Failed:`, {
          url: baseUrl + '/chat/completions',
          status: response.status,
          model: QWEN_MODEL_ID,
          error: errorText
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      
      console.log(`[Qwen] Generated text length: ${text.length}`);
      console.log(`[Qwen] Usage: ${JSON.stringify(data.usage)}`);

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
          body: JSON.stringify(requestBody),
        },
        warnings: [],
        finishReason: 'stop',
        usage: { 
          promptTokens: data.usage?.prompt_tokens || 0, 
          completionTokens: data.usage?.completion_tokens || 0 
        }
      };
    } catch (error) {
      console.error('Qwen API error details:', error);
      throw new Error(`Qwen API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async doStream(options: LanguageModelV1CallOptions) {
    const { prompt } = options;
    const messages = convertPromptToMessages(prompt);

    const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const apiKey = process.env.QWEN_API_KEY;

    console.log(`[Qwen] Initiating doStream for model: ${QWEN_MODEL_ID}`);

    if (!apiKey) {
      const errorMsg = 'QWEN_API_KEY 环境变量未设置。请在 .env 文件中设置 QWEN_API_KEY。';
      console.error(`[Qwen] Stream Error: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const requestBody = {
            model: QWEN_MODEL_ID,
            messages: messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 16384,
            top_p: 0.8,
          };
          
          console.log(`[Qwen] Stream Request Body: ${JSON.stringify(requestBody, null, 2)}`);

          const response = await fetch(baseUrl + '/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify(requestBody)
          });

          console.log(`[Qwen] Stream Response status: ${response.status} ${response.statusText}`);

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage += ` - ${errorJson.error?.message || errorText}`;
            } catch {
              errorMessage += ` - ${errorText}`;
            }
            
            console.error(`[Qwen] Stream API Request Failed:`, {
              url: baseUrl + '/chat/completions',
              status: response.status,
              model: QWEN_MODEL_ID,
              error: errorText
            });
            
            throw new Error(errorMessage);
          }
          
          console.log('[Qwen] Stream connection established, starting to read reader...');

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
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data: ')) {
                const data = trimmedLine.slice(6);
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
                  // 忽略部分解析错误，Qwen 的流式格式有时会有细微差别
                }
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('Qwen Stream error details:', error);
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
          model: QWEN_MODEL_ID,
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
