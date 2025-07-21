import TurndownService from 'turndown';

// Create an instance of TurndownService with enhanced configuration
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full',
});

// Add custom rule for strikethrough
turndownService.addRule('strikethrough', {
  filter: ['s', 'del'],
  replacement: function (content) {
    return '~~' + content + '~~';
  }
});

// Add custom rule for task lists to ensure proper formatting
turndownService.addRule('taskList', {
  filter: function (node) {
    return node.nodeName === 'UL' && node.getAttribute('data-type') === 'taskList';
  },
  replacement: function (content, node) {
    return content;
  }
});

turndownService.addRule('taskItem', {
  filter: function (node) {
    return node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem';
  },
  replacement: function (content, node) {
    const isChecked = node.getAttribute('data-checked') === 'true';
    const checkbox = isChecked ? '[x]' : '[ ]';
    
    // Clean up the content - remove the checkbox input and label wrapper
    let cleanContent = content;
    // Remove checkbox input HTML if present
    cleanContent = cleanContent.replace(/<input[^>]*type="checkbox"[^>]*>/gi, '');
    // Remove label tags
    cleanContent = cleanContent.replace(/<\/?label[^>]*>/gi, '');
    // Remove span tags
    cleanContent = cleanContent.replace(/<\/?span[^>]*>/gi, '');
    // Clean up extra whitespace
    cleanContent = cleanContent.trim();
    
    return `- ${checkbox} ${cleanContent}`;
  }
});

// Improve nested list handling
turndownService.addRule('nestedList', {
  filter: ['ul', 'ol'],
  replacement: function (content, node) {
    const parent = node.parentNode;
    if (parent && parent.nodeName === 'LI') {
      // This is a nested list, add proper indentation
      return '\n' + content.replace(/^/gm, '  ');
    }
    return content;
  }
});

// Convert HTML to Markdown
export const htmlToMarkdown = (html: string): string => {
  return turndownService.turndown(html);
};

// Convert Markdown to HTML (enhanced implementation with nested list support)
export const markdownToHtml = (markdown: string): string => {
  if (!markdown || markdown.trim() === '') {
    return '<p></p>';
  }

  const lines = markdown.split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      i++;
      continue;
    }

    // Check for headings
    if (trimmedLine.startsWith('# ')) {
      const text = trimmedLine.substring(2).trim();
      html += `<h1>${processInlineFormatting(text)}</h1>`;
      i++;
    } else if (trimmedLine.startsWith('## ')) {
      const text = trimmedLine.substring(3).trim();
      html += `<h2>${processInlineFormatting(text)}</h2>`;
      i++;
    } else if (trimmedLine.startsWith('### ')) {
      const text = trimmedLine.substring(4).trim();
      html += `<h3>${processInlineFormatting(text)}</h3>`;
      i++;
    } else if (trimmedLine.startsWith('#### ')) {
      const text = trimmedLine.substring(5).trim();
      html += `<h4>${processInlineFormatting(text)}</h4>`;
      i++;
    } else if (trimmedLine.startsWith('##### ')) {
      const text = trimmedLine.substring(6).trim();
      html += `<h5>${processInlineFormatting(text)}</h5>`;
      i++;
    } else if (trimmedLine.startsWith('###### ')) {
      const text = trimmedLine.substring(7).trim();
      html += `<h6>${processInlineFormatting(text)}</h6>`;
      i++;
    } else if (trimmedLine.startsWith('```')) {
      // Code block
      const language = trimmedLine.substring(3).trim();
      i++;
      let codeContent = '';
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      if (i < lines.length) i++; // Skip closing ```
      html += `<pre><code${language ? ` class="language-${language}"` : ''}>${codeContent.trim()}</code></pre>`;
    } else if (trimmedLine.startsWith('>')) {
      // Blockquote
      let blockquoteContent = '';
      while (i < lines.length && (lines[i].trim().startsWith('>') || lines[i].trim() === '')) {
        if (lines[i].trim().startsWith('>')) {
          blockquoteContent += lines[i].replace(/^>\s?/, '') + '\n';
        } else if (lines[i].trim() === '') {
          blockquoteContent += '\n';
        }
        i++;
      }
      html += `<blockquote><p>${processInlineFormatting(blockquoteContent.trim())}</p></blockquote>`;
    } else if (isListItem(trimmedLine)) {
      // Handle lists (both ordered and unordered, with nesting)
      const listResult = parseList(lines, i);
      html += listResult.html;
      i = listResult.nextIndex;
    } else {
      // Regular paragraph
      let paragraphContent = '';
      while (i < lines.length && lines[i].trim() !== '' && !isSpecialLine(lines[i].trim())) {
        paragraphContent += lines[i] + '\n';
        i++;
      }
      if (paragraphContent.trim()) {
        html += `<p>${processInlineFormatting(paragraphContent.trim())}</p>`;
      }
    }
  }

  return html || '<p></p>';
};

// Helper function to check if a line is a list item
function isListItem(line: string): boolean {
  // Unordered list patterns: -, *, +
  if (/^\s*[-*+]\s/.test(line)) return true;
  // Ordered list pattern: 1., 2., etc.
  if (/^\s*\d+\.\s/.test(line)) return true;
  // Task list patterns: - [ ], - [x], - [X]
  if (/^\s*[-*+]\s*\[[xX\s]\]\s/.test(line)) return true;
  return false;
}

// Helper function to check if a line is special (heading, code block, etc.)
function isSpecialLine(line: string): boolean {
  return line.startsWith('#') || 
         line.startsWith('```') || 
         line.startsWith('>') || 
         isListItem(line);
}

// Helper function to get the indentation level of a line
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

// Helper function to parse nested lists
function parseList(lines: string[], startIndex: number): { html: string; nextIndex: number } {
  const listItems: Array<{ level: number; content: string; type: 'ul' | 'ol' | 'task'; checked?: boolean }> = [];
  let i = startIndex;

  // Parse all consecutive list items
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') {
      i++;
      continue;
    }
    
    if (!isListItem(trimmedLine)) {
      break;
    }

    const level = getIndentLevel(line);
    let content = '';
    let type: 'ul' | 'ol' | 'task' = 'ul';
    let checked: boolean | undefined;

    // Determine list type and extract content
    if (/^\s*[-*+]\s*\[[xX\s]\]\s/.test(line)) {
      // Task list item
      type = 'task';
      const match = line.match(/^\s*[-*+]\s*\[([xX\s])\]\s(.*)$/);
      if (match) {
        checked = match[1].toLowerCase() === 'x';
        content = match[2];
      }
    } else if (/^\s*\d+\.\s/.test(line)) {
      // Ordered list item
      type = 'ol';
      content = line.replace(/^\s*\d+\.\s/, '');
    } else {
      // Unordered list item
      type = 'ul';
      content = line.replace(/^\s*[-*+]\s/, '');
    }

    listItems.push({ level, content: content.trim(), type, checked });
    i++;
  }

  // Convert list items to HTML with proper nesting
  const html = buildNestedListHtml(listItems);
  
  return { html, nextIndex: i };
}

// Helper function to build nested HTML from list items
function buildNestedListHtml(items: Array<{ level: number; content: string; type: 'ul' | 'ol' | 'task'; checked?: boolean }>): string {
  if (items.length === 0) return '';

  let html = '';
  const stack: Array<{ type: 'ul' | 'ol' | 'task'; level: number }> = [];
  
  for (const item of items) {
    // Close lists that are at a deeper or equal level
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      const lastList = stack.pop()!;
      if (lastList.type === 'task') {
        html += '</ul>'; // Task lists are rendered as ul with special class
      } else {
        html += `</${lastList.type}>`;
      }
    }

    // Open new lists if needed
    if (stack.length === 0 || stack[stack.length - 1].level < item.level) {
      if (item.type === 'task') {
        html += '<ul data-type="taskList">';
      } else {
        html += `<${item.type}>`;
      }
      stack.push({ type: item.type, level: item.level });
    }

    // Add the list item
    if (item.type === 'task') {
      const checkedAttr = item.checked ? ' data-checked="true"' : ' data-checked="false"';
      html += `<li data-type="taskItem"${checkedAttr}><label><input type="checkbox"${item.checked ? ' checked' : ''}><span>${processInlineFormatting(item.content)}</span></label></li>`;
    } else {
      html += `<li>${processInlineFormatting(item.content)}</li>`;
    }
  }

  // Close remaining open lists
  while (stack.length > 0) {
    const lastList = stack.pop()!;
    if (lastList.type === 'task') {
      html += '</ul>';
    } else {
      html += `</${lastList.type}>`;
    }
  }

  return html;
}

// Helper function to process inline formatting (bold, italic, etc.)
function processInlineFormatting(text: string): string {
  let result = text;

  // Bold (** or __)
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic (* or _)
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

  // Strikethrough
  result = result.replace(/~~(.*?)~~/g, '<s>$1</s>');

  // Inline code
  result = result.replace(/`(.*?)`/g, '<code>$1</code>');

  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return result;
}

// Create a safe filename from a title
export const createSafeFilename = (title: string, id: string): string => {
  return title.trim()
    ? title.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()
    : id;
};
