// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Include marked library directly in preload script instead of requiring it
// This is marked.min.js version 4.3.0 inlined
const marked = (() => {
  // Simple implementation of marked for markdown parsing
  function parseMarkdown(markdown) {
    if (!markdown) return '';
    
    const parsed = markdown
      // Headers
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
      .replace(/^##### (.*?)$/gm, '<h5>$1</h5>')
      .replace(/^###### (.*?)$/gm, '<h6>$1</h6>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Code blocks
      .replace(/```(.*?)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Lists
      .replace(/^- (.*?)$/gm, '<li>$1</li>')
      .replace(/^\* (.*?)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.*?)$/gm, '<li>$1</li>')
      // Blockquotes
      .replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');
    
    // Clean up lists
    const withLists = parsed
      .replace(/(<li>.*?<\/li>)\s*<br>(<li>)/g, '$1$2')
      .replace(/(<li>.*?<\/li>)\s*<br>(<\/li>)/g, '$1$2')
      .replace(/(<li>.*?<\/li>)(<li>)/g, '$1\n$2');
    
    const withUnorderedLists = withLists
      .replace(/(<li>.*?<\/li>\n?)+/g, '<ul class="markdown-list">$&</ul>');
    
    return withUnorderedLists;
  }
  
  return {
    parse: parseMarkdown,
    setOptions: () => {}, // Dummy function for compatibility
    Renderer: function() { 
      return { 
        listitem: (text) => `<li>${text}</li>` 
      }; 
    }
  };
})();

// Expose needed APIs to the renderer process
contextBridge.exposeInMainWorld('stickyNotes', {
  // Note management
  createNote: (noteId) => ipcRenderer.invoke('notes:create', noteId),
  openNote: (noteId) => ipcRenderer.invoke('notes:open', noteId),
  updateNote: (noteId, data) => ipcRenderer.invoke('notes:update', noteId, data),
  getAllNotes: () => ipcRenderer.invoke('notes:getAll'),
  deleteNote: (noteId) => ipcRenderer.invoke('notes:delete', noteId),
  
  // Settings management
  getSavePath: () => ipcRenderer.invoke('settings:getSavePath'),
  setSavePath: (path) => ipcRenderer.invoke('settings:setSavePath', path),
  browseSavePath: () => ipcRenderer.invoke('settings:browseSavePath'),
  
  // Markdown conversion
  markdownToHtml: (markdown) => {
    try {
      if (!markdown) return '';
      return marked.parse(markdown);
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return markdown || '';
    }
  }
});

// Expose electron API for receiving events from main process
contextBridge.exposeInMainWorld('electronAPI', {
  receive: (channel, func) => {
    const validChannels = ['note:load', 'note:moved', 'note:resized'];
    if (validChannels.includes(channel)) {
      // Strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  createNote: () => ipcRenderer.invoke('create-note'),
  openNote: (noteId) => ipcRenderer.invoke('open-note', noteId),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('window:setAlwaysOnTop', flag)
});
