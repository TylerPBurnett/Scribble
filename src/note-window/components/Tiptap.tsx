import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Paragraph from '@tiptap/extension-paragraph'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Text from '@tiptap/extension-text'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import CodeBlock from '@tiptap/extension-code-block'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import { useCallback, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import './Tiptap.css'

interface TiptapProps {
  content?: string;
  onUpdate?: (content: string) => void;
  placeholder?: string;
  autofocus?: boolean;
  editable?: boolean;
  editorClass?: string; // Additional class for the editor
  backgroundColor?: string; // Background color for the editor
  toolbarColor?: string; // Background color for the toolbar
}

export interface TiptapRef {
  focus: () => void;
}

const Tiptap = forwardRef<TiptapRef, TiptapProps>(({
  content = '<p></p>',
  onUpdate,
  placeholder = 'Start typing here...',
  autofocus = false,
  editable = true,
  editorClass = '',
  backgroundColor,
  toolbarColor,
}, ref) => {
  // State to track toolbar visibility
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  // Ref to track the editor container for keyboard events
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the built-in list extensions from StarterKit
        // so we can configure them explicitly
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Paragraph,
      Text,
      Highlight,
      Typography,
      // Explicitly configure list extensions
      BulletList.configure({
        keepMarks: true,
        keepAttributes: true,
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: true,
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: 'list-item',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      CodeBlock,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content,
    autofocus,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate?.(html);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-instance',
        spellcheck: 'true',
      },
      handleClick: () => {
        // Ensure editor is focused when clicked
        if (editor && !editor.isFocused) {
          editor.commands.focus('end');
        }
        return false; // Let the default click handler run
      },
      // Enhanced cursor handling
      handleDOMEvents: {
        focus: () => {
          // Force cursor visibility on focus
          const cursor = document.querySelector('.ProseMirror-cursor');
          if (cursor) {
            (cursor as HTMLElement).style.display = 'block';
            (cursor as HTMLElement).style.borderLeftWidth = '2px';
            (cursor as HTMLElement).style.borderLeftColor = '#000';
          }
          return false;
        },
        click: () => {
          // Force cursor visibility on click
          const cursor = document.querySelector('.ProseMirror-cursor');
          if (cursor) {
            (cursor as HTMLElement).style.display = 'block';
            (cursor as HTMLElement).style.borderLeftWidth = '2px';
            (cursor as HTMLElement).style.borderLeftColor = '#000';
          }
          return false;
        }
      }
    },
  })

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editor) {
        editor.commands.focus('end');
      }
    }
  }), [editor]);

  useEffect(() => {
    if (editor && content) {
      // Only update content if it's different from current content
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Ensure editor is focused when component mounts
  useEffect(() => {
    if (editor && autofocus) {
      // Short delay to ensure DOM is ready
      const focusTimer = setTimeout(() => {
        editor.commands.focus('end');

        // Force cursor visibility
        const cursor = document.querySelector('.ProseMirror-cursor');
        if (cursor) {
          (cursor as HTMLElement).style.display = 'block';
          (cursor as HTMLElement).style.borderLeftWidth = '2px';
          (cursor as HTMLElement).style.borderLeftColor = '#000';
        }

        // Also ensure all ProseMirror elements have proper cursor styling
        const proseMirrorElements = document.querySelectorAll('.ProseMirror, .ProseMirror p, .ProseMirror-focused');
        proseMirrorElements.forEach(el => {
          (el as HTMLElement).style.caretColor = '#000';
          (el as HTMLElement).style.cursor = 'text';
        });
      }, 100);

      return () => clearTimeout(focusTimer);
    }
  }, [editor, autofocus]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.commands.unsetLink();
      return;
    }

    // update link
    editor.commands.setLink({ href: url });
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('Image URL');

    if (url) {
      editor.commands.setImage({ src: url });
    }
  }, [editor]);

  // Add keyboard event handler to toggle toolbar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle toolbar with Alt+T
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        setIsToolbarVisible(prev => !prev);
      }
    };

    // Add event listener to the window
    window.addEventListener('keydown', handleKeyDown);

    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Toggle toolbar visibility
  const toggleToolbar = () => {
    setIsToolbarVisible(prev => !prev);
  };

  if (!editor) {
    return null;
  }

  return (
    <div
      className="tiptap-editor"
      ref={editorContainerRef}
      style={{ backgroundColor: backgroundColor || '' }}
    >
      <div
        className={`tiptap-toolbar ${isToolbarVisible ? '' : 'hidden'}`}
        style={{ backgroundColor: toolbarColor || '' }}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Bold"
        >
          <span className="icon">B</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Italic"
        >
          <span className="icon">I</span>
        </button>
        <button
          onClick={() => editor.commands.toggleUnderline()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="Underline"
        >
          <span className="icon">U</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="Strike"
        >
          <span className="icon">S</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={editor.isActive('highlight') ? 'is-active' : ''}
          title="Highlight"
        >
          <span className="icon">H</span>
        </button>
        <div className="divider"></div>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          title="Heading 1"
        >
          <span className="icon">H1</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          title="Heading 2"
        >
          <span className="icon">H2</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
          title="Heading 3"
        >
          <span className="icon">H3</span>
        </button>
        <div className="divider"></div>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Bullet List"
        >
          <span className="icon">•</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="Ordered List"
        >
          <span className="icon">1.</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={editor.isActive('taskList') ? 'is-active' : ''}
          title="Task List"
        >
          <span className="icon">☑</span>
        </button>
        <div className="divider"></div>
        <button
          onClick={() => editor.commands.setTextAlign('left')}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
          title="Align Left"
        >
          <span className="icon">←</span>
        </button>
        <button
          onClick={() => editor.commands.setTextAlign('center')}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
          title="Align Center"
        >
          <span className="icon">↔</span>
        </button>
        <button
          onClick={() => editor.commands.setTextAlign('right')}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
          title="Align Right"
        >
          <span className="icon">→</span>
        </button>
        <div className="divider"></div>
        <button onClick={setLink} className={editor.isActive('link') ? 'is-active' : ''} title="Link">
          <span className="icon">🔗</span>
        </button>
        <button onClick={addImage} title="Image">
          <span className="icon">🖼️</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          title="Code Block"
        >
          <span className="icon">{'</>'}</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          title="Blockquote"
        >
          <span className="icon">"</span>
        </button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <span className="icon">—</span>
        </button>
      </div>

      <EditorContent
        editor={editor}
        className={`tiptap-content ${editorClass}`}
        style={{ backgroundColor: backgroundColor || '' }}
        onClick={() => {
          if (editor && !editor.isFocused) {
            editor.commands.focus('end');
          }
          // Force cursor visibility
          const cursor = document.querySelector('.ProseMirror-cursor');
          if (cursor) {
            (cursor as HTMLElement).style.display = 'block';
            (cursor as HTMLElement).style.borderLeftWidth = '2px';
            (cursor as HTMLElement).style.borderLeftColor = editorClass.includes('dark-theme') ? '#fff' : '#000';
          }
        }}
        onFocus={() => {
          if (editor) {
            editor.commands.focus('end');
          }
        }}
      />

      {/* Toolbar toggle button */}
      <button className="toolbar-toggle" onClick={toggleToolbar} title={`${isToolbarVisible ? 'Hide' : 'Show'} toolbar (Alt+T)`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isToolbarVisible ? (
            <>
              {/* Hide icon - chevron down */}
              <polyline points="6 9 12 15 18 9"></polyline>
            </>
          ) : (
            <>
              {/* Show icon - chevron up */}
              <polyline points="18 15 12 9 6 15"></polyline>
            </>
          )}
        </svg>
      </button>
    </div>
  )
});

Tiptap.displayName = 'Tiptap';

export default Tiptap
