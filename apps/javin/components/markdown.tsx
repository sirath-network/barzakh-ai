import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import "./markdown.css";
import { AddressBlock } from "./AddressBlock"; // Impor komponen baru

// Simple image component without error handling
const SimpleImage = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <img
      src={src}
      alt={alt}
      className="max-w-full h-auto rounded-lg border border-border/20 shadow-lg"
      style={{ maxHeight: '500px', objectFit: 'contain' }}
      loading="lazy"
    />
  );
};

const components: Partial<Components> = {
  // @ts-expect-error
  code: CodeBlock,
  small: ({ children }) => (
    <small className="break-long-words">{children}</small>
  ),
  pre: ({ children }) => <>{children}</>,

  span: ({ children }) => {
    const text = typeof children === 'string' ? children : '';
    
    // Check if this span contains a raw image URL
    const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?[^\s]*)?)/gi;
    const match = text.match(imageUrlRegex);
    
    if (match) {
      const parts = text.split(imageUrlRegex);
      return (
        <span className="break-long-words">
          {parts.map((part, index) => {
            if (imageUrlRegex.test(part)) {
              return (
                <div key={index} className="my-4 max-w-full">
                  <SimpleImage 
                    src={part} 
                    alt="Generated image"
                  />
                </div>
              );
            }
            return part;
          })}
        </span>
      );
    }
    
    return <span className="break-long-words">{children}</span>;
  },

  p: ({ children }) => {
    const text = typeof children === 'string' ? children : 
      (Array.isArray(children) ? children.join('') : '');
    
    // Note: Removed image placeholder logic since tool-generated images are handled separately
    // and showing placeholders when actual images are present creates confusion
    
    return <div className="break-long-words">{children}</div>;
  },

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
    // Check if this is an image URL
    const href = props.href as string;
    const isImageUrl = href && (
      // Standard image file extensions
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(href) ||
      // Google Cloud Storage URLs with image extensions
      /storage\.googleapis\.com.*\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)/i.test(href) ||
      // URLs with image extensions followed by query parameters
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)\?/i.test(href) ||
      // URLs that contain image-related paths (for generated images)
      /\/images?\/.*\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)/i.test(href) ||
      // URLs that look like generated image URLs (common patterns)
      /\/generated.*\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)/i.test(href) ||
      /\/ai.*\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)/i.test(href) ||
      // Long URLs that are likely generated image URLs (like the one in the screenshot)
      (href.length > 200 && (
        /storage\.googleapis\.com/i.test(href) ||
        /X-Goog-Algorithm/i.test(href) ||
        /X-Goog-Credential/i.test(href)
      ))
    );

    if (isImageUrl) {
      return (
        <div className="my-4 max-w-full">
          <SimpleImage 
            src={href} 
            alt={typeof children === 'string' ? children : 'Generated image'}
          />
        </div>
      );
    }

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
  let filteredChildren = children.replace(/\[ORIGINAL_IMAGE_URLS_FOR_EDITING:.*?\]/g, "").trim();
  
  // Filter out standalone image URLs from text (but preserve them in markdown links and images)
  // This regex matches image URLs that appear as plain text (not in markdown syntax)
  filteredChildren = filteredChildren.replace(
    /(^|\s)(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?[^\s]*)?)(\s|$)/gi,
    '$1$5' // Replace with just the surrounding whitespace
  );
  
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {filteredChildren}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);