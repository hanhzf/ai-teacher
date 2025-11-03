// 将 LaTeX 数学公式标记从旧格式转换为新格式
// \( ... \) -> $ ... $
// \[ ... \] -> $$ ... $$
export function convertLatexFormulas(text: string): string {
  if (!text) return text;

  // 将 \( ... \) 替换为 $ ... $
  text = text.replace(/\\\((.*?)\\\)/g, (_, content) => `$${content}$`);

  // 将 \[ ... \] 替换为 $$ ... $$
  text = text.replace(/\\\[(.*?)\\\]/g, (_, content) => `$$${content}$$`);

  return text;
}