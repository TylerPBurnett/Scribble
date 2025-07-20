# Design Document

## Overview

This design document outlines the enhancement of the WYSIWYG markdown note editor built with Tiptap. The current implementation provides basic functionality but lacks the polish and features expected in a modern markdown editor similar to Obsidian. The enhancement will focus on improving the toolbar UX, adding missing markdown features, enhancing the WYSIWYG experience, and optimizing performance.

### Current State Analysis

The existing implementation uses:
- **Tiptap 2.11.7** with React integration
- **Basic extensions**: StarterKit, Highlight, Typography, TaskList, Image, Link, CodeBlock, TextAlign, Underline
- **Custom toolbar** with basic formatting buttons
- **HTML-to-Markdown conversion** using TurndownService
- **Basic markdown-to-HTML conversion** with limited feature support

### Key Issues Identified

1. **Toolbar UX Problems**:
   - Cramped layout with small buttons (22px height)
   - Poor visual hierarchy and grouping
   - Limited responsive behavior
   - Inconsistent icon design using text/emoji
   - No keyboard shortcut indicators

2. **Missing Markdown Features**:
   - No table support
   - Limited code block functionality (no syntax highlighting)
   - No markdown shortcuts (e.g., typing `##` for headings)
   - No live markdown syntax rendering
   - Limited list nesting and formatting

3. **WYSIWYG Experience Issues**:
   - No seamless markdown syntax integration
   - No live preview of markdown syntax
   - Limited keyboard navigation
   - Poor accessibility support

4. **Performance Concerns**:
   - Cursor visibility issues requiring manual DOM manipulation
   - No content virtualization for large documents
   - Inefficient re-rendering patterns

## Architecture

### Component Structure

```
NoteEditor (Container)
├── Tiptap (Enhanced Editor)
│   ├── EssentialToolbar (New Component - Top positioned, toggleable)
│   │   ├── ToolbarButton (Essential tools only)
│   │   └── ToolbarToggle (Show/hide button)
│   ├── EditorContent (Tiptap Core)
│   └── MarkdownShortcuts (New Extension)
├── KeyboardShortcuts (Enhanced)
└── SettingsPanel (Existing)
```

### Extension Architecture

The editor will use a modular extension system:

```typescript
// Core Extensions
- StarterKit (configured)
- Document
- Paragraph
- Text
- Heading (enhanced)
- Bold, Italic, Strike, Underline
- Code, CodeBlock (with syntax highlighting)
- Blockquote
- HorizontalRule

// List Extensions
- BulletList (enhanced)
- OrderedList (enhanced)
- ListItem (enhanced)
- TaskList (enhanced)
- TaskItem (enhanced)

// Advanced Extensions
- Table (new)
- TableRow, TableCell, TableHeader (new)
- Link (enhanced)
- Image (enhanced)
- Highlight (enhanced)
- TextAlign
- Placeholder

// Custom Extensions
- MarkdownShortcuts (new)
- LiveMarkdownSyntax (new)
- KeyboardNavigation (new)
- SmartPaste (new)
```

## Components and Interfaces

### ModernToolbar Component

```typescript
interface ModernToolbarProps {
  editor: Editor;
  isVisible: boolean;
  onToggle: () => void;
  theme: 'light' | 'dark';
  position: 'top'; // Fixed to top position
}

interface EssentialToolbarItem {
  id: string;
  type: 'button' | 'separator';
  icon: ReactNode;
  label: string;
  shortcut: string;
  action: () => void;
  isActive?: () => boolean;
}

// Essential markdown shortcuts only
const ESSENTIAL_TOOLS = [
  'bold', 'italic', 'strikethrough',
  'separator',
  'heading1', 'heading2', 'heading3',
  'separator', 
  'bulletList', 'orderedList', 'taskList',
  'separator',
  'link', 'codeBlock'
];
```

### Enhanced Tiptap Configuration

```typescript
interface EnhancedTiptapProps extends TiptapProps {
  markdownMode: 'wysiwyg' | 'source' | 'split';
  syntaxHighlighting: boolean;
  autoMarkdownShortcuts: boolean;
  tableSupport: boolean;
  advancedLists: boolean;
  keyboardNavigation: boolean;
  accessibilityMode: boolean;
}
```

### Markdown Integration

```typescript
interface MarkdownProcessor {
  htmlToMarkdown(html: string): string;
  markdownToHtml(markdown: string): string;
  validateMarkdown(markdown: string): ValidationResult;
  formatMarkdown(markdown: string): string;
}

interface LiveMarkdownRenderer {
  renderInline(node: Node, markdown: string): void;
  renderBlock(node: Node, markdown: string): void;
  updateSyntaxHighlighting(editor: Editor): void;
}
```

## Data Models

### Editor State

```typescript
interface EditorState {
  content: string; // HTML content
  markdown: string; // Markdown representation
  mode: 'wysiwyg' | 'source' | 'split';
  cursorPosition: number;
  selection: Selection;
  history: HistoryState;
  settings: EditorSettings;
}

interface EditorSettings {
  toolbar: {
    visible: boolean;
    position: 'top' | 'bottom' | 'floating';
    size: 'compact' | 'normal' | 'large';
    groups: string[]; // Enabled toolbar groups
  };
  editor: {
    syntaxHighlighting: boolean;
    autoMarkdownShortcuts: boolean;
    livePreview: boolean;
    keyboardNavigation: boolean;
    accessibilityMode: boolean;
  };
  markdown: {
    headingStyle: 'atx' | 'setext';
    codeBlockStyle: 'fenced' | 'indented';
    listStyle: 'dash' | 'asterisk' | 'plus';
    emDelimiter: '*' | '_';
  };
}
```

### Toolbar Configuration

```typescript
interface EssentialToolbarConfig {
  position: 'top';
  visible: boolean;
  tools: EssentialToolbarItem[];
  theme: 'light' | 'dark';
  toggleShortcut: string; // e.g., 'Alt+T'
}

// Simplified toolbar layout - only essential tools
const DEFAULT_TOOLBAR_LAYOUT = [
  { group: 'text', tools: ['bold', 'italic', 'strikethrough'] },
  { group: 'headings', tools: ['heading1', 'heading2', 'heading3'] },
  { group: 'lists', tools: ['bulletList', 'orderedList', 'taskList'] },
  { group: 'content', tools: ['link', 'codeBlock'] }
];
```

## Error Handling

### Editor Error Boundaries

```typescript
class EditorErrorBoundary extends React.Component {
  // Handle Tiptap initialization errors
  // Handle extension loading errors
  // Handle content parsing errors
  // Provide fallback UI
}
```

### Content Validation

```typescript
interface ContentValidator {
  validateHTML(html: string): ValidationResult;
  validateMarkdown(markdown: string): ValidationResult;
  sanitizeContent(content: string): string;
  recoverFromError(error: EditorError): RecoveryAction;
}
```

### Error Recovery Strategies

1. **Content Recovery**: Automatic backup and restore of content
2. **Extension Fallbacks**: Graceful degradation when extensions fail
3. **State Recovery**: Restore editor state from last known good state
4. **User Notification**: Clear error messages with recovery options

## Testing Strategy

### Unit Testing

```typescript
// Component Tests
describe('ModernToolbar', () => {
  test('renders all toolbar groups');
  test('handles responsive layout');
  test('executes commands correctly');
  test('shows keyboard shortcuts');
});

// Extension Tests
describe('MarkdownShortcuts', () => {
  test('converts ## to heading');
  test('converts - to bullet list');
  test('converts ``` to code block');
});

// Integration Tests
describe('Editor Integration', () => {
  test('markdown to HTML conversion');
  test('HTML to markdown conversion');
  test('content synchronization');
});
```

### End-to-End Testing

```typescript
// User Workflow Tests
describe('Note Editing Workflows', () => {
  test('create formatted note with toolbar');
  test('use markdown shortcuts');
  test('insert tables and media');
  test('keyboard navigation');
  test('accessibility features');
});
```

### Performance Testing

```typescript
// Performance Benchmarks
describe('Editor Performance', () => {
  test('large document handling');
  test('real-time typing performance');
  test('toolbar responsiveness');
  test('memory usage optimization');
});
```

## Implementation Phases

### Phase 1: Toolbar Enhancement
- Redesign toolbar with modern UI
- Implement responsive layout
- Add proper icons and tooltips
- Improve keyboard shortcuts display

### Phase 2: Markdown Integration
- Add markdown shortcuts extension
- Implement live markdown syntax rendering
- Enhance HTML/Markdown conversion
- Add table support

### Phase 3: Advanced Features
- Implement syntax highlighting for code blocks
- Add advanced list formatting
- Enhance image and link handling
- Improve keyboard navigation

### Phase 4: Performance & Accessibility
- Optimize rendering performance
- Add comprehensive accessibility support
- Implement content virtualization
- Add advanced error handling

## Technical Considerations

### Tiptap Extension Development

Custom extensions will follow Tiptap's extension API:

```typescript
const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',
  
  addInputRules() {
    return [
      // Heading shortcuts
      textblockTypeInputRule({
        find: /^(#{1,6})\s$/,
        type: this.editor.schema.nodes.heading,
        getAttributes: match => ({ level: match[1].length }),
      }),
      // List shortcuts
      wrappingInputRule({
        find: /^\s*([-+*])\s$/,
        type: this.editor.schema.nodes.bulletList,
      }),
      // Code block shortcuts
      textblockTypeInputRule({
        find: /^```([a-z]+)?\s$/,
        type: this.editor.schema.nodes.codeBlock,
        getAttributes: match => ({ language: match[1] }),
      }),
    ];
  },
});
```

### Performance Optimizations

1. **Virtual Scrolling**: For large documents
2. **Debounced Updates**: For real-time features
3. **Lazy Loading**: For heavy extensions
4. **Memory Management**: Proper cleanup of event listeners

### Accessibility Enhancements

1. **ARIA Labels**: Comprehensive labeling for screen readers
2. **Keyboard Navigation**: Full keyboard support
3. **Focus Management**: Proper focus handling
4. **High Contrast**: Support for high contrast themes
5. **Screen Reader**: Optimized for screen reader users

This design provides a comprehensive foundation for transforming the current basic Tiptap implementation into a modern, feature-rich WYSIWYG markdown editor that rivals tools like Obsidian while maintaining the simplicity and performance expected in a note-taking application.