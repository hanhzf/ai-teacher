import Link from 'next/link';
import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { CodeBlock } from './code-block';

const components: Partial<Components> = {
  // @ts-expect-error
  code: CodeBlock,
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-disc list-outside ml-4" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    );
  },
};

// 添加数学公式支持
// 将 remarkMath 放在 remarkGfm 之前,避免 GFM 先行处理反斜杠转义,
// 导致 \(...\) 与 \[...\] 语法无法被正确识别。
// remarkMath 支持行内:\(...\) / $...$,块级:\[...\] / $$...$$
const remarkPlugins = [remarkMath, remarkGfm];
const rehypePlugins = [rehypeKatex];

// 预处理函数:将旧格式的 LaTeX 公式转换为新格式
// 这样可以确保在流式传输过程中也能正确渲染
const preprocessLatex = (content: string): string => {
  // 将 \( ... \) 转换为 $ ... $
  content = content.replace(/\\\((.+?)\\\)/g, '$$$1$$');
  
  // 将 \[ ... \] 转换为 $$ ... $$
  // 使用 's' 标志使 . 匹配换行符,支持多行公式
  content = content.replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$$1$$$$');
  
  return content;
};

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  // 预处理内容,将旧格式转换为新格式
  const processedContent = preprocessLatex(children);
  
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);