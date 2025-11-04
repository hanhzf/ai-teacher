import type { TextStreamPart } from 'ai';
import type { ToolSet } from 'ai';

/**
 * 创建一个 TransformStream，用于将流中的 LaTeX 公式标记从 \( ... \) 转换为 $ ... $
 * @returns TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>
 */
export function createLatexFormulaTransformer<TOOLS extends ToolSet>() {
  return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
    transform(chunk, controller) {
      // 只处理 text-delta 类型的块
      if (chunk.type === 'text-delta') {
        // 使用正则表达式替换 \( ... \) 为 $ ... $
        // 注意：在字符串中，\( 需要写成 \\(，而实际匹配时是 \(
        const transformedText = chunk.textDelta.replace(/\\\((.*?)\\\)/g, (_, content) => `$${content}$`);

        // 发送修改后的块
        controller.enqueue({
          ...chunk,
          textDelta: transformedText
        });
      } else {
        // 对于其他类型的块，直接传递
        controller.enqueue(chunk);
      }
    }
  });
}