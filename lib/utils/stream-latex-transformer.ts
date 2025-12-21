import type { TextStreamPart, StreamTextTransform, ToolSet } from 'ai';

/**
 * 创建一个 TransformStream，用于将流中的 LaTeX 公式标记标准化
 * 自动检测并处理各种转义情况
 */
export function createLatexFormulaTransformer<TOOLS extends ToolSet>(): StreamTextTransform<TOOLS> {
  return () => {
    let buffer = ''; // 缓冲区用于处理跨块的公式

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type === 'text-delta') {
          buffer += chunk.textDelta;

          // 尝试处理完整的 LaTeX 公式
          let processedText = '';
          let lastProcessedIndex = 0;

          // 正则说明：
          // \\+\( : 匹配一个或多个反斜杠 + 左括号
          // .*? : 非贪婪匹配公式内容
          // \\+\) : 匹配一个或多个反斜杠 + 右括号
          const latexRegex = /\\+\((.*?)\\+\)/g;
          let match;

          while ((match = latexRegex.exec(buffer)) !== null) {
            // 添加公式前的普通文本
            processedText += buffer.slice(lastProcessedIndex, match.index);

            // 提取公式内容（去除括号标记）
            const formulaContent = match[1];
            
            // 标准化公式内容中的反斜杠
            // 将多个反斜杠统一为单个反斜杠
            const normalizedContent = formulaContent.replace(/\\+/g, '\\');

            // 转换为 $ ... $ 格式
            processedText += `$${normalizedContent}$`;

            lastProcessedIndex = match.index + match[0].length;
          }

          // 检查缓冲区末尾是否有未完成的公式开始标记
          const incompleteMatch = buffer.slice(lastProcessedIndex).match(/\\+\((?!.*\\+\))/);
          
          if (incompleteMatch) {
            // 有未完成的公式，保留在缓冲区
            processedText += buffer.slice(lastProcessedIndex, lastProcessedIndex + incompleteMatch.index!);
            buffer = buffer.slice(lastProcessedIndex + incompleteMatch.index!);
          } else {
            // 没有未完成的公式，全部输出
            processedText += buffer.slice(lastProcessedIndex);
            buffer = '';
          }

          // 发送处理后的文本
          if (processedText) {
            controller.enqueue({
              ...chunk,
              textDelta: processedText
            });
          }
        } else {
          controller.enqueue(chunk);
        }
      },

      flush(controller) {
        // 流结束时处理剩余内容
        if (buffer) {
          // 对剩余内容也做标准化处理
          let finalText = buffer.replace(/\\+\((.*?)\\+\)/g, (_, content) => {
            const normalized = content.replace(/\\+/g, '\\');
            return `$${normalized}$`;
          });

          controller.enqueue({
            type: 'text-delta',
            textDelta: finalText
          } as TextStreamPart<TOOLS>);
        }
      }
    });
  };
}