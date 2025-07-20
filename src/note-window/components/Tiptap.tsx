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
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import EssentialToolbar from './EssentialToolbar'
import { getSettings, subscribeToSettingsChanges } from '../../shared/services/settingsService'
import { getHotkeys, formatHotkeyForDisplay } from '../../shared/services/hotkeyService'
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

  // Expose focus method and toolbar controls via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editor) {
        editor.commands.focus('end');
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





  // Add keyboard event handler to toggle toolbar using current hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get fresh settings each time to avoid stale state
      const settings = getSettings();
      const hotkeys = getHotkeys(settings);
      const toggleToolbarHotkey = hotkeys.toggleToolbar || 'alt+t';
      
      console.log('🔧 Keyboard event - Current hotkey from settings:', toggleToolbarHotkey);
      console.log('🔧 Key pressed:', {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey
      });
      
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
      
      console.log('🔧 Parsed hotkey:', {
        hotkeyParts,
        hasCtrl,
        hasAlt,
        hasShift,
        hasMeta,
        key
      });
      
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
      
      console.log('🔧 Match check:', {
        keyMatches,
        modifiersMatch,
        shouldToggle: keyMatches && modifiersMatch
      });
      
      if (keyMatches && modifiersMatch) {
        console.log('🔧 TOGGLING TOOLBAR!');
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
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      )}
    </div>
  )
});

Tiptap.displayName = 'Tiptap';

export default Tiptap
