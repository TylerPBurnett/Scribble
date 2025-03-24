// DOM Elements
const noteContainer = document.querySelector('.note-container');
const noteEditor = document.getElementById('note-editor');
const notePreview = document.getElementById('note-preview');
const btnMinimize = document.getElementById('btn-minimize');
const btnPin = document.getElementById('btn-pin');
const btnClose = document.getElementById('btn-close');
const btnFormat = document.getElementById('btn-format');
const btnColor = document.getElementById('btn-color');
const btnSave = document.getElementById('btn-save');
const btnTogglePreview = document.getElementById('btn-toggle-preview');
const formatPanel = document.getElementById('format-panel');
const colorPanel = document.getElementById('color-panel');
const fontFamily = document.getElementById('font-family');
const fontSize = document.getElementById('font-size');
const notebookBg = document.getElementById('notebook-bg');
const fontColor = document.getElementById('font-color');
const customColor = document.getElementById('custom-color');
const colorOptions = document.querySelectorAll('.color-option');
const noteStatus = document.getElementById('note-status');

// Current note data
let noteData = {
  id: null,
  content: '',
  color: '#192734',
  fontColor: '#E7E9EA',
  fontSize: 14,
  fontFamily: 'Arial',
  notebookBg: false,
  position: null,
  size: null,
  isPreviewMode: false,
  isPinned: false
};

// Auto-save status
let isModified = false;
let isSaving = false;

// Light background colors that need dark text
const lightColors = ['#F8D7DA', '#CCE5FF', '#FFF3CD', '#F8F9FA'];

// Debounce helper function
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
};

// Initialize the note
const initNote = async () => {
  // Listen for note data from the main process
  window.electronAPI?.receive('note:load', (data) => {
    loadNoteData(data);
  });
  
  window.electronAPI?.receive('note:moved', (position) => {
    noteData.position = position;
    setModified(true);
    saveNoteDebounced();
  });
  
  window.electronAPI?.receive('note:resized', (size) => {
    noteData.size = size;
    setModified(true);
    saveNoteDebounced();
  });
  
  // Set up event listeners
  setupEventListeners();
  
  // Start auto-save interval
  setInterval(checkAutoSave, 3000);
};

// Mark the note as modified and update UI
const setModified = (modified) => {
  isModified = modified;
  updateSaveIndicator();
};

// Update the save indicator based on current state
const updateSaveIndicator = () => {
  if (isSaving) {
    btnSave.innerHTML = `
      <svg class="save-icon" viewBox="0 0 24 24" width="16" height="16">
        <path d="M5 5V19H19V9L15 5H5Z" stroke="currentColor" stroke-width="2" fill="none"/>
        <rect x="8" y="5" width="8" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
        <rect x="8" y="14" width="8" height="5" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
    btnSave.classList.add('saving');
    btnSave.classList.remove('modified');
    noteStatus.textContent = 'Saving...';
  } else if (isModified) {
    btnSave.innerHTML = `
      <svg class="save-icon" viewBox="0 0 24 24" width="16" height="16">
        <path d="M5 5V19H19V9L15 5H5Z" stroke="currentColor" stroke-width="2" fill="none"/>
        <rect x="8" y="5" width="8" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
        <rect x="8" y="14" width="8" height="5" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
    btnSave.classList.add('modified');
    btnSave.classList.remove('saving');
    noteStatus.textContent = 'Modified';
  } else {
    btnSave.innerHTML = `
      <svg class="save-icon" viewBox="0 0 24 24" width="16" height="16">
        <path d="M5 5V19H19V9L15 5H5Z" stroke="currentColor" stroke-width="2" fill="none"/>
        <rect x="8" y="5" width="8" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
        <rect x="8" y="14" width="8" height="5" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
    btnSave.classList.remove('modified');
    btnSave.classList.remove('saving');
    noteStatus.textContent = 'Saved';
  }
};

// Check if auto-save is needed
const checkAutoSave = () => {
  if (isModified && !isSaving) {
    saveNote();
  }
};

// Load note data and apply it to the UI
const loadNoteData = (data) => {
  if (!data) return;
  
  noteData = { ...noteData, ...data };
  
  // Set content
  noteEditor.value = noteData.content || '';
  updatePreview();
  
  // Apply styles
  applyNoteStyles();
  
  // Set form values
  fontFamily.value = noteData.fontFamily || 'Arial';
  fontSize.value = noteData.fontSize || 14;
  notebookBg.checked = noteData.notebookBg || false;
  fontColor.value = noteData.fontColor || '#E7E9EA';
  customColor.value = noteData.color || '#192734';
  
  // Update selected color option
  updateSelectedColor(noteData.color);
  
  // Set preview mode
  if (noteData.isPreviewMode) {
    togglePreview(true);
  }
  
  // Reset modified state after loading
  setModified(false);
};

// Update the selected color option
const updateSelectedColor = (color) => {
  // Remove selected class from all options
  colorOptions.forEach(option => {
    option.classList.remove('selected');
    
    // Add selected class to the matching option
    if (option.dataset.color === color) {
      option.classList.add('selected');
    }
  });
  
  // Update custom color input
  customColor.value = color;
};

// Apply note styling based on noteData
const applyNoteStyles = () => {
  // Apply note background color
  noteContainer.style.backgroundColor = noteData.color;
  
  // Toggle light/dark theme based on background color
  if (lightColors.includes(noteData.color)) {
    noteContainer.classList.add('light-theme');
    // If we're switching to light theme, update font color to dark if it was light
    if (noteData.fontColor === '#E7E9EA') {
      noteData.fontColor = '#15202B';
      fontColor.value = noteData.fontColor;
    }
  } else {
    noteContainer.classList.remove('light-theme');
    // If we're switching to dark theme, update font color to light if it was dark
    if (noteData.fontColor === '#15202B') {
      noteData.fontColor = '#E7E9EA';
      fontColor.value = noteData.fontColor;
    }
  }
  
  // Apply notebook paper background if enabled
  if (noteData.notebookBg) {
    noteContainer.classList.add('notebook-paper');
  } else {
    noteContainer.classList.remove('notebook-paper');
  }
  
  // Apply font styling
  noteEditor.style.fontFamily = noteData.fontFamily;
  noteEditor.style.fontSize = `${noteData.fontSize}px`;
  noteEditor.style.color = noteData.fontColor;
  
  notePreview.style.fontFamily = noteData.fontFamily;
  notePreview.style.fontSize = `${noteData.fontSize}px`;
  notePreview.style.color = noteData.fontColor;
  
  // Update pin button appearance based on state
  if (noteData.isPinned) {
    btnPin.classList.add('active');
  } else {
    btnPin.classList.remove('active');
  }
};

// Update the preview with rendered markdown
const updatePreview = () => {
  const markdown = noteEditor.value;
  try {
    // Apply markdown conversion
    const html = window.stickyNotes.markdownToHtml(markdown);
    notePreview.innerHTML = html;
    
    // Add proper CSS classes for better Markdown styling
    notePreview.querySelectorAll('ul').forEach(ul => {
      ul.classList.add('markdown-list');
    });
    
    notePreview.querySelectorAll('ol').forEach(ol => {
      ol.classList.add('markdown-list');
    });
    
    notePreview.querySelectorAll('code').forEach(code => {
      if (!code.parentElement.tagName === 'PRE') {
        code.classList.add('inline-code');
      }
    });
    
    notePreview.querySelectorAll('pre').forEach(pre => {
      pre.classList.add('code-block');
    });
    
    notePreview.querySelectorAll('blockquote').forEach(quote => {
      quote.classList.add('markdown-quote');
    });
  } catch (error) {
    console.error('Error updating preview:', error);
    notePreview.innerHTML = `<p>Error rendering markdown: ${error.message}</p><pre>${markdown}</pre>`;
  }
};

// Toggle between edit and preview mode
const togglePreview = (showPreview = null) => {
  const isPreview = showPreview !== null ? showPreview : !noteData.isPreviewMode;
  
  if (isPreview) {
    updatePreview();
    noteEditor.classList.add('hidden');
    notePreview.classList.remove('hidden');
    btnTogglePreview.textContent = 'Edit';
  } else {
    noteEditor.classList.remove('hidden');
    notePreview.classList.add('hidden');
    btnTogglePreview.textContent = 'Preview';
  }
  
  noteData.isPreviewMode = isPreview;
  setModified(true);
  saveNoteDebounced();
};

// Save the note data
const saveNote = async () => {
  // Update content from editor
  noteData.content = noteEditor.value;
  
  // Set saving state
  isSaving = true;
  updateSaveIndicator();
  
  // Save to storage via IPC
  try {
    await window.stickyNotes.updateNote(noteData.id, noteData);
    // Reset modified state
    setModified(false);
  } catch (error) {
    console.error('Error saving note:', error);
    noteStatus.textContent = 'Error saving';
  } finally {
    // Clear saving state
    isSaving = false;
    updateSaveIndicator();
  }
};

// Debounced save function for auto-saving
const saveNoteDebounced = debounce(() => {
  if (isModified) {
    saveNote();
  }
}, 1000);

// Set up all event listeners
const setupEventListeners = () => {
  // Close button
  btnClose.addEventListener('click', () => {
    // Make sure note is saved before closing
    if (isModified) {
      saveNote().then(() => window.close());
    } else {
      window.close();
    }
  });
  
  // Minimize button
  btnMinimize.addEventListener('click', () => {
    window.electronAPI?.minimize();
  });
  
  // Format panel toggle
  btnFormat.addEventListener('click', () => {
    formatPanel.classList.toggle('hidden');
    colorPanel.classList.add('hidden'); // Close color panel if open
  });
  
  // Color panel toggle
  btnColor.addEventListener('click', () => {
    colorPanel.classList.toggle('hidden');
    formatPanel.classList.add('hidden'); // Close format panel if open
  });
  
  // Save button now acts as indicator only
  btnSave.addEventListener('click', () => {
    if (isModified) {
      saveNote();
    }
  });
  
  // Toggle preview mode
  btnTogglePreview.addEventListener('click', () => togglePreview());
  
  // Content changes
  noteEditor.addEventListener('input', () => {
    setModified(true);
    saveNoteDebounced();
  });
  
  // Font family change
  fontFamily.addEventListener('change', () => {
    noteData.fontFamily = fontFamily.value;
    applyNoteStyles();
    setModified(true);
    saveNoteDebounced();
  });
  
  // Font size change
  fontSize.addEventListener('change', () => {
    noteData.fontSize = parseInt(fontSize.value, 10);
    applyNoteStyles();
    setModified(true);
    saveNoteDebounced();
  });
  
  // Notebook background toggle
  notebookBg.addEventListener('change', () => {
    noteData.notebookBg = notebookBg.checked;
    applyNoteStyles();
    setModified(true);
    saveNoteDebounced();
  });
  
  // Font color change
  fontColor.addEventListener('change', () => {
    noteData.fontColor = fontColor.value;
    applyNoteStyles();
    setModified(true);
    saveNoteDebounced();
  });
  
  // Custom background color change
  customColor.addEventListener('change', () => {
    const color = customColor.value;
    noteData.color = color;
    updateSelectedColor(color);
    applyNoteStyles();
    setModified(true);
    saveNoteDebounced();
  });
  
  // Predefined color options
  colorOptions.forEach(option => {
    option.addEventListener('click', () => {
      const color = option.dataset.color;
      noteData.color = color;
      updateSelectedColor(color);
      applyNoteStyles();
      setModified(true);
      saveNoteDebounced();
    });
  });
  
  // Click outside panels to close them
  document.addEventListener('click', (e) => {
    if (!formatPanel.contains(e.target) && e.target !== btnFormat && !formatPanel.classList.contains('hidden')) {
      formatPanel.classList.add('hidden');
    }
    
    if (!colorPanel.contains(e.target) && e.target !== btnColor && !colorPanel.classList.contains('hidden')) {
      colorPanel.classList.add('hidden');
    }
  });
  
  // Pin button
  btnPin.addEventListener('click', () => {
    noteData.isPinned = !noteData.isPinned;
    window.electronAPI?.setAlwaysOnTop(noteData.isPinned);
    applyNoteStyles();
    setModified(true);
    saveNoteDebounced();
  });
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initNote); 