import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import "./markdown.css";
import { AddressBlock } from "./AddressBlock"; // Impor komponen baru

const components: Partial<Components> = {
  // @ts-expect-error
  code: CodeBlock,
  small: ({ children }) => (
    <small className="break-long-words">{children}</small>
  ),
  pre: ({ children }) => <>{children}</>,

  span: ({ children }) => <span className="break-long-words">{children}</span>,

  p: ({ children }) => <div className="break-long-words">{children}</div>,

  ol: ({ node, children, ...props }) => {
    return (
      <ol
        className="break-long-words list-decimal list-outside ml-4"
        {...props}
      >
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="break-long-words py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="break-long-words list-disc list-outside ml-4" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    // ---- PERUBAHAN UTAMA DIMULAI DI SINI ----
    const textContent =
      children && typeof children[0] === "string" ? children[0] : "";

    // Regex untuk mendeteksi pola umum alamat blockchain
    const isAddress =
      /^(0x[a-fA-F0-9]{40}|(sei|cosmos|osmo|apt)[a-z0-9]{38,})$/.test(
        textContent.trim()
      );

    if (isAddress) {
      return <AddressBlock address={textContent} />;
    }

    // Jika bukan alamat, render sebagai teks tebal biasa
    return (
      <span className="break-long-words font-semibold" {...props}>
        {children}
      </span>
    );
    // ---- PERUBAHAN UTAMA BERAKHIR DI SINI ----
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="break-long-words text-blue-500 hover:underline inline-block"
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
      <h1
        className="break-long-words text-3xl font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2
        className="break-long-words text-2xl font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3
        className="break-long-words text-xl font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4
        className="break-long-words text-lg font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5
        className="break-long-words text-base font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6
        className="break-long-words text-sm font-semibold mt-6 mb-2"
        {...props}
      >
        {children}
      </h6>
    );
  },
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);