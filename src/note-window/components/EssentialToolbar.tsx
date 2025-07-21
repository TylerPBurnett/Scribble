import React, { useState } from 'react';
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
  theme = 'light'
}) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedText, setSelectedText] = useState('');

  // Handle link dialog submission
  const handleLinkSubmit = () => {
    console.log('Link dialog submitted with URL:', linkUrl);
    
    if (linkUrl === '') {
      console.log('Removing link');
      editor.chain().focus().unsetLink().run();
    } else {
      console.log('Setting link with URL:', linkUrl);
      showMarkdownSyntax(`[${selectedText || 'text'}](${linkUrl})`);
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    
    setShowLinkDialog(false);
    setLinkUrl('');
    setSelectedText('');
  };

  // Handle link dialog cancellation
  const handleLinkCancel = () => {
    console.log('Link dialog cancelled');
    setShowLinkDialog(false);
    setLinkUrl('');
    setSelectedText('');
  };
  // Function to show markdown syntax tooltip
  const showMarkdownSyntax = (syntax: string) => {
    // Remove any existing tooltip
    const existingTooltip = document.getElementById('markdown-syntax-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'markdown-syntax-tooltip';
    tooltip.className = 'markdown-syntax-tooltip';
    tooltip.textContent = `Markdown: ${syntax}`;
    tooltip.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    `;
    
    document.body.appendChild(tooltip);
    
    // Fade in
    setTimeout(() => {
      tooltip.style.opacity = '1';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 200);
    }, 1500);
  };
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
      action: () => {
        showMarkdownSyntax('**text**');
        editor.chain().focus().toggleBold().run();
      },
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
      action: () => {
        showMarkdownSyntax('*text*');
        editor.chain().focus().toggleItalic().run();
      },
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
      action: () => {
        showMarkdownSyntax('~~text~~');
        editor.chain().focus().toggleStrike().run();
      },
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
    {
      id: 'taskList',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      ),
      label: 'Task List',
      shortcut: 'Ctrl+Shift+9',
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive('taskList')
    },
    
    // Separator
    { id: 'sep3', type: 'separator', label: '', shortcut: '' },
    
    // Content group
    {
      id: 'inlineCode',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
        </svg>
      ),
      label: 'Inline Code',
      shortcut: 'Ctrl+E',
      action: () => {
        showMarkdownSyntax('`code`');
        editor.chain().focus().toggleCode().run();
      },
      isActive: () => editor.isActive('code')
    },
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
        console.log('🔗 Link button clicked!');
        try {
          const previousUrl = editor.getAttributes('link').href;
          console.log('Previous URL:', previousUrl);
          
          // Get selected text for the dialog
          const { from, to } = editor.state.selection;
          const currentSelectedText = editor.state.doc.textBetween(from, to);
          console.log('Selected text:', currentSelectedText);
          
          // Set up the dialog state
          setSelectedText(currentSelectedText);
          setLinkUrl(previousUrl || '');
          setShowLinkDialog(true);
        } catch (error) {
          console.error('Error in link button action:', error);
        }
      },
      isActive: () => editor.isActive('link')
    },
    {
      id: 'blockquote',
      type: 'button',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
        </svg>
      ),
      label: 'Blockquote',
      shortcut: 'Ctrl+Shift+.',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote')
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

      {/* Custom Link Dialog */}
      {showLinkDialog && (
        <div className="link-dialog-overlay" onClick={handleLinkCancel}>
          <div className="link-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Add Link</h3>
            <div className="link-dialog-content">
              {selectedText && (
                <div className="selected-text">
                  Text: <strong>{selectedText}</strong>
                </div>
              )}
              <input
                type="url"
                placeholder="Enter URL (e.g., https://example.com)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLinkSubmit();
                  } else if (e.key === 'Escape') {
                    handleLinkCancel();
                  }
                }}
                autoFocus
              />
              <div className="link-dialog-buttons">
                <button onClick={handleLinkCancel} className="cancel-button">
                  Cancel
                </button>
                <button onClick={handleLinkSubmit} className="submit-button">
                  {linkUrl ? 'Add Link' : 'Remove Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EssentialToolbar;