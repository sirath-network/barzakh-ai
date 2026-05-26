import Link from "next/link";
import React, { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import { CodeBlockCompact } from "./code-block-compact";
import "./markdown.css";
import { extractWebFilesFromMarkdown, type WebFile } from "@/lib/combine-web-files";
import type { Message } from "ai";

// Check if we should use compact view - for cleaner chat experience
const USE_COMPACT_CODE_BLOCKS = true;

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

// Create components inside the component to access allWebFiles
const createComponents = (allWebFiles: WebFile[]): Partial<Components> => ({
  code: (props: any) => {
    const { className, children, node, ...rest } = props;

    // Check if this is inline code (no language class) or a code block
    // Inline code: `code` - no className or className without language-
    // Block code: ```language\ncode``` - has className with language-
    const isInlineCode = !className || !className.includes('language-');

    if (isInlineCode) {
      // Render inline code as a simple styled <code> element
      return (
        <code
          className="px-1.5 py-0.5 mx-0.5 text-sm font-mono bg-muted/50 rounded border border-border/30 break-words"
          {...rest}
        >
          {children}
        </code>
      );
    }

    // For block code, use CodeBlockCompact or CodeBlock
    const Component = USE_COMPACT_CODE_BLOCKS ? CodeBlockCompact : CodeBlock;
    return <Component className={className} {...rest} allCodeBlocks={allWebFiles}>{children}</Component>;
  },
  small: ({ children }) => (
    <small className="break-long-words">{children}</small>
  ),
  pre: ({ children }) => {
    // Pre elements are block-level and should not be wrapped in p tags
    // Return a div wrapper to prevent hydration errors
    return (
      <div className="not-prose my-0 max-w-full overflow-x-auto">
        {children}
      </div>
    );
  },

  span: ({ children }) => {
    const text = typeof children === 'string' ? children : '';

    // Check if this span contains a raw image URL
    const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?[^\s]*)?)/gi;
    const match = text.match(imageUrlRegex);

    if (match) {
      const parts = text.split(imageUrlRegex);
      return (
        <div className="break-long-words">
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
            return <span key={index}>{part}</span>;
          })}
        </div>
      );
    }

    return <span className="break-long-words">{children}</span>;
  },

  p: ({ children, node }) => {
    // Helper to recursively check for block-level elements in children
    const checkForBlockElements = (elements: React.ReactNode): boolean => {
      return React.Children.toArray(elements).some((child: any) => {
        if (!child || typeof child !== 'object') return false;

        // Check for code elements with language classes (these become CodeBlockCompact = div)
        if (child?.props?.className?.includes('language-')) {
          return true;
        }

        // Check the node property (HAST node) for code with className
        if (child?.props?.node?.properties?.className) {
          const classNames = child.props.node.properties.className;
          if (Array.isArray(classNames) && classNames.some((c: string) => c?.includes?.('language-'))) {
            return true;
          }
        }

        // Check for CodeBlock or CodeBlockCompact components
        if (child?.type?.name === 'CodeBlock' || child?.type?.name === 'CodeBlockCompact') {
          return true;
        }

        // Check for pre elements (preformatted text blocks)
        if (child?.type === 'pre') {
          return true;
        }

        // Check for image containers
        if (child?.props?.className?.includes('my-4 max-w-full') ||
          child?.props?.className?.includes('block my-4 max-w-full')) {
          return true;
        }

        // Check for any div elements
        if (child?.type === 'div') {
          return true;
        }

        // Check for block spans
        if (child?.type === 'span' && child?.props?.className?.includes('block')) {
          return true;
        }

        // Recursively check nested children
        if (child?.props?.children) {
          return checkForBlockElements(child.props.children);
        }

        return false;
      });
    };

    const hasBlockElements = checkForBlockElements(children);

    // Use div for block elements to avoid <p> nesting issues
    if (hasBlockElements) {
      return <div className="break-long-words my-1.5 first:mt-0 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</div>;
    }

    return <p className="break-long-words my-1.5 first:mt-0 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>;
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
    // Filter out image elements from list items
    const filteredChildren = React.Children.toArray(children).filter((child: any) => {
      // Check if the child is an img element
      if (child?.type === 'img' || (child?.props && child.props.src)) {
        return false; // Remove img elements
      }
      // Check if the child contains image URLs in text
      if (typeof child === 'string') {
        const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?[^\s]*)?)/gi;
        return !imageUrlRegex.test(child);
      }
      return true; // Keep other elements
    });

    return (
      <li className="break-long-words py-1" {...props}>
        {filteredChildren}
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
  strong: ({ node, children, ...props }: any) => (
    <span className="break-long-words font-semibold" {...props}>
      {children}
    </span>
  ),
  a: ({ node, children, ...props }: any) => {
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
        <span className="block my-4 max-w-full">
          <SimpleImage
            src={href}
            alt={typeof children === 'string' ? children : 'Generated image'}
          />
        </span>
      );
    }

    const LinkComponent = Link as any;
    return (
      <LinkComponent
        className="break-long-words text-blue-500 hover:underline inline-block"
        target="_blank"
        rel="noreferrer"
        href={href}
      >
        {children}
      </LinkComponent>
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
  table: ({ node, children, ...props }) => {
    return (
      <div className="my-4 w-full overflow-x-auto rounded-lg border border-border/40 shadow-sm">
        <table
          className="w-full border-collapse bg-background/50"
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },
  thead: ({ node, children, ...props }) => {
    return (
      <thead
        className="bg-muted/80 border-b border-border/50"
        {...props}
      >
        {children}
      </thead>
    );
  },
  tbody: ({ node, children, ...props }) => {
    return (
      <tbody className="divide-y divide-border/30" {...props}>
        {children}
      </tbody>
    );
  },
  tr: ({ node, children, ...props }) => {
    return (
      <tr
        className="transition-colors hover:bg-muted/30"
        {...props}
      >
        {children}
      </tr>
    );
  },
  th: ({ node, children, ...props }) => {
    return (
      <th
        className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border/30 last:border-r-0"
        {...props}
      >
        {children}
      </th>
    );
  },
  td: ({ node, children, ...props }) => {
    return (
      <td
        className="px-4 py-3 text-sm text-foreground/90 border-r border-border/20 last:border-r-0"
        {...props}
      >
        {children}
      </td>
    );
  },
  blockquote: ({ node, children, ...props }) => {
    return (
      <blockquote
        className="border-l-4 border-primary/50 pl-4 py-2 my-4 italic text-muted-foreground bg-muted/30 rounded-r-lg"
        {...props}
      >
        {children}
      </blockquote>
    );
  },
  hr: ({ node, ...props }) => {
    return (
      <hr
        className="my-6 border-t border-border/50"
        {...props}
      />
    );
  },
  // Strip strikethrough formatting - AI sometimes uses ~~text~~ to "correct" itself
  // which looks messy. Render strikethrough content as normal text instead.
  del: ({ node, children, ...props }) => {
    return <span className="break-long-words">{children}</span>;
  },
});

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children, allMessages = [] }: { children: string; allMessages?: Message[] }) => {
  // Extract all web files from ALL assistant messages in the conversation
  // This ensures we get the latest version of each file across multiple messages
  const allWebFiles = useMemo(() => {
    const filesMap = new Map<string, WebFile>();

    // Process all assistant messages in chronological order
    // Later messages will overwrite earlier versions of the same file
    allMessages
      .filter(msg => msg.role === 'assistant')
      .forEach(msg => {
        let content = '';
        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          content = (msg.content as any[]).map((p: any) => p.type === 'text' ? p.text : '').join('\n');
        }

        const files = extractWebFilesFromMarkdown(content);
        files.forEach(file => {
          // Use filename as key to keep only the latest version
          filesMap.set(file.fileName, file);
        });
      });

    return Array.from(filesMap.values());
  }, [allMessages]);

  let filteredChildren = children;

  filteredChildren = filteredChildren.replace(/\[ORIGINAL_IMAGE_URLS_FOR_EDITING:.*?\]/g, "").trim();

  // Convert custom image URL patterns to proper markdown images
  // Matches patterns like [EDITED_IMAGE_URL: url], [IMAGE_URL: url], [GENERATED_IMAGE: url]
  // This handles cases where the AI outputs custom formats instead of standard markdown image syntax
  filteredChildren = filteredChildren.replace(
    /\[(?:EDITED_IMAGE_URL|IMAGE_URL|GENERATED_IMAGE):\s*\n*(https?:\/\/[^\s\]]+)\s*\n*\]/gi,
    '\n\n![Generated image]($1)\n\n'
  );

  // Filter out standalone image URLs from text (but preserve them in markdown links and images)
  // This regex matches image URLs that appear as plain text (not in markdown syntax)
  filteredChildren = filteredChildren.replace(
    /(^|\s)(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?[^\s]*)?)(\s|$)/gi,
    '$1$5' // Replace with just the surrounding whitespace
  );

  // Filter out broken image references that might contain "here" or other broken text
  // This handles cases where the AI generates text like "here" as broken image placeholders
  filteredChildren = filteredChildren.replace(
    /(^|\s)(here)(\s|$)/gi,
    '$1$3' // Remove standalone "here" words that might be broken image references
  );

  // Filter out any remaining broken image references or placeholders
  filteredChildren = filteredChildren.replace(
    /(^|\s)(image\s+here|here\s+image|view\s+here|here\s+view)(\s|$)/gi,
    '$1$3' // Remove broken image reference patterns
  );

  // Filter out stray punctuation and conjunctions between code blocks
  // This removes fragments like ", and", ",", "and", etc. that appear between code blocks
  filteredChildren = filteredChildren.replace(
    /```([a-z]*)\n([\s\S]*?)```\s*[,;]\s*(and|or)?\s*```/gi,
    '```$1\n$2```\n\n```'
  );

  // Remove standalone commas, semicolons, and conjunctions that appear on their own lines
  filteredChildren = filteredChildren.replace(
    /^\s*[,;]\s*(and|or)?\s*$/gm,
    ''
  );

  // Clean up multiple consecutive blank lines (leave max 2)
  filteredChildren = filteredChildren.replace(/\n{3,}/g, '\n\n');

  // Create components with access to all web files
  const components = useMemo(() => createComponents(allWebFiles), [allWebFiles]);

  return (
    <div className="markdown-body max-w-full min-w-0 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {filteredChildren}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.allMessages === nextProps.allMessages
);