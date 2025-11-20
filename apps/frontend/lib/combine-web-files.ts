/**
 * Utility to combine HTML, CSS, and JavaScript files into a single HTML document
 * for preview purposes (like Claude Artifacts)
 */

export interface WebFile {
  fileName: string;
  language: string;
  content: string;
}

/**
 * Combines HTML, CSS, and JavaScript files into a single HTML document
 */
export function combineWebFiles(files: WebFile[]): string {
  const htmlFile = files.find(f => f.language === 'html' || f.fileName.endsWith('.html'));
  const cssFiles = files.filter(f => f.language === 'css' || f.fileName.endsWith('.css'));
  const jsFiles = files.filter(f => 
    f.language === 'javascript' || 
    f.language === 'js' ||
    f.fileName.endsWith('.js') || 
    f.fileName.endsWith('.mjs')
  );

  if (!htmlFile) {
    // If no HTML file, create a basic HTML structure
    return createBasicHTML(cssFiles, jsFiles);
  }

  let html = htmlFile.content;

  // Inject CSS into the HTML
  if (cssFiles.length > 0) {
    const cssContent = cssFiles.map(f => f.content).join('\n\n');
    const styleTag = `<style>\n${cssContent}\n</style>`;
    
    // Try to inject before </head> or </body> or append
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${styleTag}\n</head>`);
    } else if (html.includes('</body>')) {
      html = html.replace('</body>', `${styleTag}\n</body>`);
    } else {
      html = html + `\n${styleTag}`;
    }
  }

  // Inject JavaScript into the HTML
  if (jsFiles.length > 0) {
    const jsContent = jsFiles.map(f => f.content).join('\n\n');
    const scriptTag = `<script>\n${jsContent}\n</script>`;
    
    // Try to inject before </body> or append
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${scriptTag}\n</body>`);
    } else {
      html = html + `\n${scriptTag}`;
    }
  }

  return html;
}

/**
 * Creates a basic HTML structure when no HTML file is provided
 */
function createBasicHTML(cssFiles: WebFile[], jsFiles: WebFile[]): string {
  const cssContent = cssFiles.map(f => f.content).join('\n\n');
  const jsContent = jsFiles.map(f => f.content).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  ${cssContent ? `<style>\n${cssContent}\n</style>` : ''}
</head>
<body>
  <div id="app"></div>
  ${jsContent ? `<script>\n${jsContent}\n</script>` : ''}
</body>
</html>`;
}

/**
 * Extracts web files from markdown code blocks in a message
 */
export function extractWebFilesFromMarkdown(markdown: string): WebFile[] {
  const files: WebFile[] = [];
  
  // Match various patterns:
  // 1. **filename:** followed by ```language
  // 2. Plain ```language
  // 3. filename.ext: (without bold) followed by ```language
  const patterns = [
    // Pattern 1: **filename:** then code block
    /\*\*([^*]+)\*\*:\s*\n```(\w+)\n([\s\S]*?)```/g,
    // Pattern 2: filename: then code block (no bold)
    /^([a-zA-Z0-9_.-]+\.[a-zA-Z]+):\s*\n```(\w+)\n([\s\S]*?)```/gm,
    // Pattern 3: Plain code block (we'll extract filename from comments)
    /```(\w+)\n([\s\S]*?)```/g
  ];
  
  const seenBlocks = new Set<string>();
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
      let fileName: string;
      let language: string;
      let content: string;
      
      if (match.length === 4 && match[1] && match[2] && match[3]) {
        // Pattern 1 or 2: has filename
        fileName = match[1].trim();
        language = match[2].toLowerCase();
        content = match[3].trim();
      } else if (match.length === 3) {
        // Pattern 3: plain code block
        language = match[1].toLowerCase();
        content = match[2].trim();
        
        // Try to extract filename from first line comment
        const firstLine = content.split('\n')[0];
        const commentMatch = firstLine.match(/^(?:\/\/|#|<!--)\s*([a-zA-Z0-9_.-]+\.[a-zA-Z]+)/);
        fileName = commentMatch ? commentMatch[1] : `file.${language}`;
      } else {
        continue;
      }
      
      // Only process web-related languages
      if (['html', 'css', 'javascript', 'js'].includes(language)) {
        const blockKey = `${language}:${content.substring(0, 50)}`;
        if (!seenBlocks.has(blockKey)) {
          seenBlocks.add(blockKey);
          files.push({
            fileName,
            language,
            content,
          });
        }
      }
    }
  }
  
  return files;
}

/**
 * Checks if a message contains web files that can be combined for preview
 */
export function hasWebFiles(markdown: string): boolean {
  const files = extractWebFilesFromMarkdown(markdown);
  return files.some(f => ['html', 'css', 'javascript', 'js'].includes(f.language));
}

/**
 * Checks if files can be combined into a preview
 */
export function canCombineFiles(files: WebFile[]): boolean {
  const hasHTML = files.some(f => f.language === 'html');
  const hasCSS = files.some(f => f.language === 'css');
  const hasJS = files.some(f => ['javascript', 'js'].includes(f.language));
  
  // Can combine if we have HTML, or if we have CSS/JS (we'll create HTML wrapper)
  return hasHTML || hasCSS || hasJS;
}

