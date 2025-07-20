import React from 'react';
import { Editor } from '@tiptap/react';
import { getSettings } from '../../shared/services/settingsService';
import { getHotkeys, formatHotkeyForDisplay } from '../../shared/services/hotkeyService';
import './EssentialToolbar.css';

interface EssentialToolbarProps {
  editor: Editor;
  isVisible: boolean;
  onToggle: () => void;
  theme?: 'light' | 'dark';
  backgroundColor?: string;
}

interface ToolbarItem {
  id: string;
  type: 'button' | 'separator';
  icon?: React.ReactNode;
  label: string;
  shortcut: string;
  action?: () => void;
  isActive?: () => boolean;
}

const EssentialToolbar: React.FC<EssentialToolbarProps> = ({
  editor,
  isVisible,
  onToggle,
  theme = 'light',
  backgroundColor
}) => {
  const toolbarItems: ToolbarItem[] = [
    // Text formatting group
    {
      id: 'bold',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      ),
      label: 'Bold',
      shortcut: 'Ctrl+B',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold')
    },
    {
      id: 'italic',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 4h-9M14 20H5M15 4L9 20"/>
        </svg>
      ),
      label: 'Italic',
      shortcut: 'Ctrl+I',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic')
    },
    {
      id: 'strikethrough',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 4H9a3 3 0 0 0-2.83 4"/>
          <path d="M14 12a4 4 0 0 1 0 8H6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
        </svg>
      ),
      label: 'Strikethrough',
      shortcut: 'Ctrl+Shift+S',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike')
    },
    
    // Separator
    { id: 'sep1', type: 'separator', label: '', shortcut: '' },
    
    // Headings group
    {
      id: 'heading1',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h8m-8-6v12m8-12v12m2-7h4m0-2v4m0 0v4"/>
        </svg>
      ),
      label: 'Heading 1',
      shortcut: 'Ctrl+Alt+1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 })
    },
    {
      id: 'heading2',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h8m-8-6v12m8-12v12m1-3h6l-4-4v8"/>
        </svg>
      ),
      label: 'Heading 2',
      shortcut: 'Ctrl+Alt+2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 })
    },
    {
      id: 'heading3',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h8m-8-6v12m8-12v12m2-3h4c1 0 2-1 2-2s-1-2-2-2-2 1-2 2"/>
        </svg>
      ),
      label: 'Heading 3',
      shortcut: 'Ctrl+Alt+3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 })
    },
    
    // Separator
    { id: 'sep2', type: 'separator', label: '', shortcut: '' },
    
    // Lists group
    {
      id: 'bulletList',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      ),
      label: 'Bullet List',
      shortcut: 'Ctrl+Shift+8',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList')
    },
    {
      id: 'orderedList',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="10" y1="6" x2="21" y2="6"/>
          <line x1="10" y1="12" x2="21" y2="12"/>
          <line x1="10" y1="18" x2="21" y2="18"/>
          <path d="M4 6h1v4"/>
          <path d="M4 10h2"/>
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
        </svg>
      ),
      label: 'Numbered List',
      shortcut: 'Ctrl+Shift+7',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList')
    },
    
    // Separator
    { id: 'sep3', type: 'separator', label: '', shortcut: '' },
    
    // Content group
    {
      id: 'link',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      ),
      label: 'Link',
      shortcut: 'Ctrl+K',
      action: () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        
        if (url === null) return;
        
        if (url === '') {
          editor.commands.unsetLink();
          return;
        }
        
        editor.commands.setLink({ href: url });
      },
      isActive: () => editor.isActive('link')
    },
    {
      id: 'codeBlock',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      ),
      label: 'Code Block',
      shortcut: 'Ctrl+Alt+C',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock')
    }
  ];

  const renderToolbarItem = (item: ToolbarItem) => {
    if (item.type === 'separator') {
      return <div key={item.id} className="essential-toolbar-separator" />;
    }

    return (
      <button
        key={item.id}
        className={`essential-toolbar-button ${item.isActive?.() ? 'is-active' : ''}`}
        onClick={item.action}
        title={`${item.label} (${item.shortcut})`}
        type="button"
      >
        {item.icon}
      </button>
    );
  };

  if (!isVisible) {
    return null;
  }

  // Get the current toolbar toggle keybind from settings
  const settings = getSettings();
  const hotkeys = getHotkeys(settings);
  const toggleToolbarHotkey = formatHotkeyForDisplay(hotkeys.toggleToolbar || 'alt+t');

  return (
    <div className={`essential-toolbar ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <div className="essential-toolbar-content">
        {toolbarItems.map(renderToolbarItem)}
      </div>
      
      <button
        className="essential-toolbar-toggle"
        onClick={onToggle}
        title={`Hide toolbar (${toggleToolbarHotkey})`}
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </div>
  );
};

export default EssentialToolbar;