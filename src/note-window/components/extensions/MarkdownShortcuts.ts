import { Extension } from '@tiptap/core';
import { textblockTypeInputRule, wrappingInputRule } from '@tiptap/core';

/**
 * MarkdownShortcuts Extension
 * 
 * Provides live markdown syntax conversion for common markdown patterns:
 * - Headings: #, ##, ### followed by space
 * - Bullet lists: -, *, + followed by space
 * - Ordered lists: 1. followed by space
 * - Task lists: - [ ] and - [x]
 * - Code blocks: ``` followed by space
 * - Blockquotes: > followed by space
 */
export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    return [
      // Heading shortcuts: # ## ### #### ##### ######
      textblockTypeInputRule({
        find: /^(#{1,6})\s$/,
        type: this.editor.schema.nodes.heading,
        getAttributes: (match) => {
          const level = match[1].length;
          return { level: Math.min(level, 6) }; // Ensure level doesn't exceed 6
        },
      }),

      // Bullet list shortcuts: - * +
      wrappingInputRule({
        find: /^\s*([-+*])\s$/,
        type: this.editor.schema.nodes.bulletList,
      }),

      // Ordered list shortcuts: 1. 2. etc.
      wrappingInputRule({
        find: /^\s*(\d+\.)\s$/,
        type: this.editor.schema.nodes.orderedList,
      }),

      // Task list shortcuts: - [ ] and - [x]
      wrappingInputRule({
        find: /^\s*(-\s\[([ x])\])\s$/,
        type: this.editor.schema.nodes.taskList,
      }),

      // Code block shortcuts: ```
      textblockTypeInputRule({
        find: /^```([a-z]*)\s$/,
        type: this.editor.schema.nodes.codeBlock,
        getAttributes: (match) => {
          const language = match[1] || null;
          return { language };
        },
      }),

      // Blockquote shortcuts: >
      wrappingInputRule({
        find: /^\s*>\s$/,
        type: this.editor.schema.nodes.blockquote,
      }),
    ];
  },

  // Keyboard shortcuts are now handled by EnhancedListHandling extension
  // to avoid conflicts and provide more comprehensive list functionality
});

export default MarkdownShortcuts;