// DOM Elements
const btnNewNote = document.getElementById('btn-new-note');
const btnSettings = document.getElementById('btn-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnCancelSettings = document.getElementById('btn-cancel-settings');
const btnBrowse = document.getElementById('btn-browse');
const settingsPanel = document.getElementById('settings-panel');
const notesList = document.getElementById('notes-list');
const emptyState = document.querySelector('.empty-state');
const savePathInput = document.getElementById('save-path');
const currentSavePathDisplay = document.getElementById('current-save-path');
const searchInput = document.getElementById('search-notes');
const clearSearchBtn = document.getElementById('clear-search');

// Store all loaded notes for searching without having to reload
let allNotes = [];

// Initialize the app
const initApp = async () => {
  // Load the current save path
  await loadSavePath();
  
  // Load existing notes
  await loadNotes();
  
  // Set up event listeners
  setupEventListeners();
};

// Load the current save path from settings
const loadSavePath = async () => {
  try {
    const savePath = await window.stickyNotes.getSavePath();
    savePathInput.value = savePath;
    currentSavePathDisplay.textContent = savePath;
  } catch (error) {
    console.error('Error loading save path:', error);
    currentSavePathDisplay.textContent = 'Error loading save location';
  }
};

// Load all existing notes
const loadNotes = async () => {
  try {
    const notes = await window.stickyNotes.getAllNotes();
    
    // Store all notes for search
    allNotes = notes;
    
    // Display notes
    displayNotes(notes);
  } catch (error) {
    console.error('Error loading notes:', error);
    notesList.innerHTML = '<p class="error-message">Failed to load notes. Please try again.</p>';
  }
};

// Display notes in the UI
const displayNotes = (notes, searchTerm = '') => {
  // Clear previous notes
  notesList.innerHTML = '';
  
  // Show empty state if no notes
  if (!notes || notes.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  // Hide empty state if we have notes
  emptyState.classList.add('hidden');
  
  // Sort notes by updated date (newest first)
  notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  // Create note cards
  notes.forEach(note => {
    const noteCard = createNoteCard(note, searchTerm);
    notesList.appendChild(noteCard);
  });
};

// Fuzzy search function
const fuzzySearch = (text, query) => {
  // Convert both strings to lowercase for case-insensitive search
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // If query is empty, return early
  if (!queryLower) return { match: false, score: 0, highlighted: text };
  
  // Simple exact match first for better performance
  if (textLower.includes(queryLower)) {
    // Calculate how much of the text is matched (as a percentage)
    const score = queryLower.length / textLower.length;
    
    // Create highlighted version
    const highlighted = text.replace(
      new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 
      match => `<span class="highlight">${match}</span>`
    );
    
    return { match: true, score, highlighted };
  }
  
  // For fuzzy search, check if all characters in query appear in order in the text
  let lastIndex = -1;
  let score = 0;
  let matched = true;
  const charPositions = [];
  
  // Check if all characters in the query exist in order in the text
  for (let i = 0; i < queryLower.length; i++) {
    const char = queryLower[i];
    const index = textLower.indexOf(char, lastIndex + 1);
    
    if (index === -1) {
      matched = false;
      break;
    }
    
    charPositions.push(index);
    lastIndex = index;
    
    // Consecutive characters get a higher score
    if (i > 0 && index === charPositions[i-1] + 1) {
      score += 2;
    } else {
      score += 1;
    }
  }
  
  if (!matched) return { match: false, score: 0, highlighted: text };
  
  // Normalize score based on query length and text length
  score = score / (textLower.length * queryLower.length);
  
  // Create highlighted version
  let highlighted = '';
  let lastPos = 0;
  
  charPositions.forEach(pos => {
    // Add text before this character
    highlighted += text.substring(lastPos, pos);
    // Add the highlighted character
    highlighted += `<span class="highlight">${text[pos]}</span>`;
    lastPos = pos + 1;
  });
  
  // Add the rest of the text
  highlighted += text.substring(lastPos);
  
  return { match: true, score, highlighted };
};

// Search notes function
const searchNotes = (query) => {
  if (!query.trim()) {
    // If search is empty, display all notes
    displayNotes(allNotes);
    return;
  }
  
  // Search results with scores
  const results = allNotes.map(note => {
    // Search in title first (extracted from content)
    let title = 'Untitled Note';
    const headingMatch = note.content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      title = headingMatch[1];
    } else {
      const firstLineMatch = note.content.match(/^(.+)$/m);
      if (firstLineMatch) {
        title = firstLineMatch[1];
      }
    }
    
    // Perform fuzzy searches
    const titleSearch = fuzzySearch(title, query);
    const contentSearch = fuzzySearch(note.content, query);
    
    // Title matches are weighted more heavily
    const score = titleSearch.match ? titleSearch.score * 2 : 0 + 
                 contentSearch.match ? contentSearch.score : 0;
    
    return {
      note,
      score,
      match: titleSearch.match || contentSearch.match,
      titleHighlighted: titleSearch.highlighted,
      contentHighlighted: contentSearch.highlighted
    };
  });
  
  // Filter matching notes
  const matches = results.filter(result => result.match);
  
  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score);
  
  // Extract just the notes and display them
  const filteredNotes = matches.map(match => ({
    ...match.note,
    _titleHighlighted: match.titleHighlighted,
    _contentHighlighted: match.contentHighlighted
  }));
  
  displayNotes(filteredNotes, query);
};

// Create a note card element
const createNoteCard = (note, searchTerm = '') => {
  const noteCard = document.createElement('div');
  noteCard.className = 'note-card';
  noteCard.style.backgroundColor = note.color || '#FFFF88';
  
  // Get title from the first line or first heading
  let title = 'Untitled Note';
  let preview = note.content || '';
  
  // Extract title from content (first heading or first line)
  const headingMatch = preview.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    title = headingMatch[1];
    // Remove the heading from the preview
    preview = preview.replace(/^#\s+(.+)$/m, '').trim();
  } else {
    // Get first line as title
    const firstLineMatch = preview.match(/^(.+)$/m);
    if (firstLineMatch) {
      title = firstLineMatch[1];
      if (title.length > 30) {
        title = title.substring(0, 30) + '...';
      }
    }
  }
  
  // Use highlighted versions if available from search
  if (note._titleHighlighted) {
    title = note._titleHighlighted;
  }
  
  if (note._contentHighlighted) {
    preview = note._contentHighlighted;
  } else if (searchTerm) {
    // Highlight search term in preview if not already highlighted
    preview = preview.replace(
      new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 
      match => `<span class="highlight">${match}</span>`
    );
  }
  
  // Format the date
  const updatedDate = note.updatedAt ? new Date(note.updatedAt) : new Date();
  const formattedDate = updatedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  // Create card content
  noteCard.innerHTML = `
    <h3 class="note-title">${title}</h3>
    <div class="note-preview">${preview}</div>
    <div class="note-date">${formattedDate}</div>
    <button class="note-delete" title="Delete Note">×</button>
  `;
  
  // Add click event to open note
  noteCard.addEventListener('click', (event) => {
    if (!event.target.classList.contains('note-delete')) {
      window.stickyNotes.openNote(note.id);
    }
  });
  
  // Add delete listener
  const deleteBtn = noteCard.querySelector('.note-delete');
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); // Prevent opening the note
    
    if (confirm(`Are you sure you want to delete "${title.replace(/<[^>]*>/g, '')}"?`)) {
      try {
        await window.stickyNotes.deleteNote(note.id);
        noteCard.remove();
        
        // Remove note from allNotes array
        const index = allNotes.findIndex(n => n.id === note.id);
        if (index !== -1) {
          allNotes.splice(index, 1);
        }
        
        // Check if we need to show the empty state
        if (notesList.children.length === 0) {
          emptyState.classList.remove('hidden');
        }
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete the note. Please try again.');
      }
    }
  });
  
  return noteCard;
};

// Create a new note
async function createNewNote() {
  try {
    console.log('Attempting to create a new note...');
    
    // Try to create a new note via electronAPI
    const noteId = await window.electronAPI.createNote();
    console.log(`Note created with ID: ${noteId}`);
    
    // We'll reload notes after a short delay to ensure the new note is saved
    setTimeout(async () => {
      await loadNotes();
      console.log('Notes list reloaded');
    }, 500);
  } catch (error) {
    console.error('Error creating note:', error);
    
    // Show a more specific error message
    let errorMessage = 'Failed to create a new note. Please try again.';
    if (error && error.message) {
      errorMessage += ` Error: ${error.message}`;
    }
    
    // Display the error to the user
    alert(errorMessage);
  }
}

// Set up event listeners
const setupEventListeners = () => {
  // New note button
  btnNewNote.addEventListener('click', createNewNote);
  
  // Settings button
  btnSettings.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });
  
  // Save settings button
  btnSaveSettings.addEventListener('click', async () => {
    const newPath = savePathInput.value;
    
    try {
      const success = await window.stickyNotes.setSavePath(newPath);
      
      if (success) {
        currentSavePathDisplay.textContent = newPath;
        settingsPanel.classList.add('hidden');
        await loadNotes(); // Reload notes from new location
      } else {
        alert('Failed to set the save location. Please try another path.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  });
  
  // Cancel settings button
  btnCancelSettings.addEventListener('click', () => {
    // Reset the input value and hide the panel
    loadSavePath();
    settingsPanel.classList.add('hidden');
  });
  
  // Browse button for save path
  btnBrowse.addEventListener('click', async () => {
    try {
      const result = await window.stickyNotes.browseSavePath();
      if (result && result.filePath) {
        savePathInput.value = result.filePath;
      }
    } catch (error) {
      console.error('Error browsing for folder:', error);
    }
  });
  
  // Refresh button for notes list
  document.addEventListener('keydown', async (e) => {
    // Ctrl+R or F5 to refresh notes list
    if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
      await loadNotes();
    }
  });
  
  // Search input
  searchInput.addEventListener('input', () => {
    // Update the search UI
    if (searchInput.value.length > 0) {
      searchInput.parentElement.classList.add('has-search-input');
    } else {
      searchInput.parentElement.classList.remove('has-search-input');
    }
    
    // Perform search with slight debounce
    clearTimeout(searchInput._timeout);
    searchInput._timeout = setTimeout(() => {
      searchNotes(searchInput.value);
    }, 300); // 300ms debounce
  });
  
  // Clear search button
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.parentElement.classList.remove('has-search-input');
    displayNotes(allNotes);
    searchInput.focus();
  });
  
  // Enable clearing with Escape key
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (searchInput.value) {
        searchInput.value = '';
        searchInput.parentElement.classList.remove('has-search-input');
        displayNotes(allNotes);
        e.preventDefault(); // Prevent dialog close
      }
    }
  });
};

// Add event listeners after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (!window.stickyNotes) {
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2>Error: Sticky Notes API Not Available</h2>
        <p>The application couldn't initialize properly. Please restart the application.</p>
      </div>
    `;
    console.error('Sticky Notes API not available');
    return;
  }
  
  // Initialize the app if the API is available
  initApp();
  
  // Handle the specific button shown in the screenshot
  const newNoteBtn = document.querySelector('#newNoteBtn, button.new-note-btn, [data-action="new-note"]');
  if (newNoteBtn) {
    console.log('Found the New Note button from screenshot:', newNoteBtn);
    newNoteBtn.addEventListener('click', createNewNote);
  }
  
  // Add click handler for any "New Note" button
  document.querySelectorAll('button').forEach(button => {
    if (button.textContent.includes('New Note')) {
      console.log('Found a New Note button:', button);
      button.addEventListener('click', createNewNote);
    }
  });
  
  // Set up a MutationObserver to catch dynamically added buttons
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          // Check if the added node is a button or contains buttons
          if (node.nodeType === 1) { // ELEMENT_NODE
            // If it's a button with "New Note" text
            if (node.tagName === 'BUTTON' && node.textContent.includes('New Note')) {
              console.log('Dynamically added New Note button:', node);
              node.addEventListener('click', createNewNote);
            }
            
            // Also check for buttons inside the added node
            const buttons = node.querySelectorAll('button');
            buttons.forEach(button => {
              if (button.textContent.includes('New Note')) {
                console.log('Found nested New Note button:', button);
                button.addEventListener('click', createNewNote);
              }
            });
          }
        });
      }
    });
  });
  
  // Start observing the document body for additions
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}); 