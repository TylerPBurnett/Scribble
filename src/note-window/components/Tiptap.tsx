import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ListKit } from '@tiptap/extension-list'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import EssentialToolbar from './EssentialToolbar'
import { getSettings } from '../../shared/services/settingsService'
import { getHotkeys, formatHotkeyForDisplay } from '../../shared/services/hotkeyService'
// import MarkdownShortcuts from './extensions/MarkdownShortcuts'
import EnhancedListHandling from './extensions/EnhancedListHandling'
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
  toggleToolbar: () => void;
  isToolbarVisible: () => boolean;
}

const Tiptap = forwardRef<TiptapRef, TiptapProps>(({
  content = '<p></p>',
  onUpdate,
  placeholder = 'Start typing here...',
  autofocus = false,
  editable = true,
  editorClass = '',
  backgroundColor,
}, ref) => {
  // State to track toolbar visibility
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  // Ref to track the editor container for keyboard events
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      // Core extensions - StarterKit provides the foundation
      StarterKit.configure({
        // Configure heading levels for better structure
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // Keep default list extensions disabled since we use ListKit
        bulletList: false,
        orderedList: false,
        listItem: false,
        // Configure other built-in extensions
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'inline-code',
          },
        },
        strike: {
          HTMLAttributes: {
            class: 'strikethrough',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'blockquote',
          },
        },
      }),

      // List extensions - Use ListKit for better integration
      ListKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'ordered-list',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'list-item',
          },
        },
      }),

      // Task list extensions (not included in ListKit)
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-list-item',
        },
      }),

      // Text styling extensions
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'highlight',
        },
      }),
      Typography,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Underline,

      // Media and link extensions
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'ftp', 'mailto'],
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'editor-link',
        },
      }),

      // UI extensions
      Placeholder.configure({
        placeholder,
        includeChildren: true,
        showOnlyCurrent: false,
      }),

      // Custom extensions
      EnhancedListHandling,

      // Obsidian-style editing: Show markdown syntax when cursor is in element
      // ObsidianStyleEditing.configure({
      //   types: ['heading', 'bulletList', 'orderedList', 'taskList', 'blockquote'],
      // }),
    ],
    content,
    autofocus,
    editable,
    // Optimize editor performance
    enableInputRules: true,
    enablePasteRules: true,
    enableCoreExtensions: true,
    injectCSS: false, // We handle CSS ourselves

    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Debug logging to see what HTML is being saved (only in development)
      if (process.env.NODE_ENV === 'development' && (html.includes('<ol>') || html.includes('<ul>'))) {
        console.log('💾 SAVING HTML:', html);
        console.log('📝 HTML structure:', html.replace(/></g, '>\n<'));
      }
      onUpdate?.(html);
    },

    editorProps: {
      attributes: {
        class: 'tiptap-editor-instance',
        spellcheck: 'true',
        'data-testid': 'tiptap-editor',
      },

      handleClick: () => {
        // Ensure editor is focused when clicked
        if (editor && !editor.isFocused) {
          editor.commands.focus();
        }
        return false; // Let the default click handler run
      },

      // Enhanced cursor and interaction handling
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
        },

        // Improve paste handling
        paste: () => {
          // Let Tiptap handle paste events naturally
          return false;
        },

        // Improve drop handling for better UX
        drop: () => {
          // Let Tiptap handle drop events naturally
          return false;
        }
      }
    },
  })

  // Expose focus method and toolbar controls via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editor && !editor.isDestroyed) {
        // Use 'start' for better UX - cursor goes to beginning of content
        editor.commands.focus('start');
      }
    },
    toggleToolbar: () => {
      setIsToolbarVisible(prev => !prev);
    },
    isToolbarVisible: () => {
      return isToolbarVisible;
    }
  }), [editor, isToolbarVisible]);

  useEffect(() => {
    if (editor && content && !editor.isDestroyed) {
      // Only update content if it's different from current content
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        // Debug logging to see what content is being loaded (only in development)
        if (process.env.NODE_ENV === 'development' && (content.includes('<ol>') || content.includes('<ul>'))) {
          console.log('🔄 Loading HTML content:', content);
          console.log('📥 Content structure:', content.replace(/></g, '>\n<'));
        }

        // Set the content with proper error handling
        try {
          editor.commands.setContent(content, false, {
            preserveWhitespace: 'full',
          });
        } catch (error) {
          console.error('Error setting editor content:', error);
          // Fallback to empty paragraph if content is invalid
          editor.commands.setContent('<p></p>');
        }

        // Debug logging and refresh decorations after content is loaded
        if (process.env.NODE_ENV === 'development') {
          setTimeout(() => {
            const newHTML = editor.getHTML();
            if (newHTML.includes('<ol>') || newHTML.includes('<ul>')) {
              console.log('✅ HTML after loading:', newHTML);
              console.log('🔍 Final structure:', newHTML.replace(/></g, '>\n<'));
            }
            // Refresh decorations after content is loaded
            if (editor.commands.refreshListDecorations) {
              editor.commands.refreshListDecorations();
            }
          }, 100);
        }
      }
    }
  }, [editor, content]);

  // Ensure editor is focused when component mounts
  useEffect(() => {
    if (editor && autofocus && !editor.isDestroyed) {
      // Short delay to ensure DOM is ready
      const focusTimer = setTimeout(() => {
        // Focus at the end of content for better UX
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





  // Add keyboard event handler to toggle toolbar using current hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get fresh settings each time to avoid stale state
      const settings = getSettings();
      const hotkeys = getHotkeys(settings);
      const toggleToolbarHotkey = hotkeys.toggleToolbar || 'alt+t';

      // Don't process if it's only a modifier key being pressed
      if (['Control', 'Alt', 'Shift', 'Meta', 'Option', 'Command'].includes(e.key)) {
        return;
      }

      // Parse the hotkey string to check if it matches the current key combination
      const hotkeyParts = toggleToolbarHotkey.toLowerCase().split('+');
      const hasCtrl = hotkeyParts.includes('ctrl') || hotkeyParts.includes('control');
      const hasAlt = hotkeyParts.includes('alt');
      const hasShift = hotkeyParts.includes('shift');
      const hasMeta = hotkeyParts.includes('meta') || hotkeyParts.includes('cmd') || hotkeyParts.includes('command');
      const key = hotkeyParts[hotkeyParts.length - 1]; // Last part is the key

      // Check if the current key combination matches the configured hotkey
      // On Mac, Option+T generates special characters, so we need to check the code instead
      const keyMatches =
        e.key.toLowerCase() === key ||
        e.code.toLowerCase() === `key${key}` ||
        e.code.toLowerCase() === `key${key.toUpperCase()}` ||
        (key === 't' && e.code === 'KeyT') ||
        (key === 'c' && e.code === 'KeyC') ||
        (key === 'n' && e.code === 'KeyN');

      const modifiersMatch =
        e.ctrlKey === hasCtrl &&
        e.altKey === hasAlt &&
        e.shiftKey === hasShift &&
        e.metaKey === hasMeta;

      if (keyMatches && modifiersMatch) {
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
  }, []); // No dependencies to avoid re-renders

  // Toggle toolbar visibility
  const toggleToolbar = () => {
    setIsToolbarVisible(prev => !prev);
  };

  if (!editor) {
    return null;
  }

  // Determine theme based on editor class
  const theme = editorClass.includes('dark-theme') ? 'dark' : 'light';

  return (
    <div
      className="tiptap-editor"
      ref={editorContainerRef}
      style={{ backgroundColor: backgroundColor || '' }}
    >
      <EssentialToolbar
        editor={editor}
        isVisible={isToolbarVisible}
        onToggle={toggleToolbar}
        theme={theme}
        backgroundColor={backgroundColor}
      />

      <EditorContent
        editor={editor}
        className={`tiptap-content ${editorClass}`}
        style={{ backgroundColor: backgroundColor || '' }}
        onClick={() => {
          if (editor && !editor.isFocused && !editor.isDestroyed) {
            editor.commands.focus();
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
          if (editor && !editor.isDestroyed) {
            editor.commands.focus();
          }
        }}
      />

      {/* Show toolbar toggle button when toolbar is hidden */}
      {!isToolbarVisible && (
        <button
          className="toolbar-toggle"
          onClick={toggleToolbar}
          title={`Show toolbar (${(() => {
            const settings = getSettings();
            const hotkeys = getHotkeys(settings);
            return formatHotkeyForDisplay(hotkeys.toggleToolbar || 'alt+t');
          })()})`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  )
});

Tiptap.displayName = 'Tiptap';

export default Tiptap
