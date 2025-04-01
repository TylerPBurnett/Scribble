const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Define a simple preferences object instead of using electron-store
const preferences = {
  // Default preferences
  savePath: path.join(app.getPath('documents'), 'StickyNotes'),
  defaultWidth: 300,
  defaultHeight: 300,
  openNotes: [] // Add this to track open note IDs
};

// Path to the preferences file
const preferencesPath = path.join(app.getPath('userData'), 'preferences.json');

// Load preferences from file
function loadPreferences() {
  try {
    if (fs.existsSync(preferencesPath)) {
      const data = fs.readFileSync(preferencesPath, 'utf8');
      const savedPrefs = JSON.parse(data);
      
      // Update preferences with saved values
      Object.assign(preferences, savedPrefs);
      console.log('Preferences loaded:', preferences);
    } else {
      console.log('No saved preferences found, using defaults');
      // Save default preferences for future use
      savePreferences();
    }
    
    // Ensure openNotes is always an array
    if (!Array.isArray(preferences.openNotes)) {
      preferences.openNotes = [];
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
    // Reset to defaults if there was an error
    preferences.openNotes = [];
  }
}

// Save preferences to file
function savePreferences() {
  try {
    // Make sure the user data directory exists
    const userDataDir = path.dirname(preferencesPath);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    // Convert to JSON and save
    const prefsJson = JSON.stringify(preferences, null, 2);
    fs.writeFileSync(preferencesPath, prefsJson);
    console.log('Preferences saved to:', preferencesPath);
    console.log('Saved preferences content:', prefsJson);
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

// Save the list of currently open notes
function saveOpenNotes() {
  const openNoteIds = Array.from(noteWindows.keys());
  console.log(`Saving ${openNoteIds.length} open notes:`, openNoteIds);
  preferences.openNotes = openNoteIds;
  savePreferences();
}

// Ensure the save directory exists
function ensureSavePath() {
  if (!fs.existsSync(preferences.savePath)) {
    fs.mkdirSync(preferences.savePath, { recursive: true });
  }
  return preferences.savePath;
}

// Map to track all note windows
const noteWindows = new Map();

// Create a new sticky note window
function createNoteWindow(noteData = null) {
  // Create a new browser window for the note
  const noteWindow = new BrowserWindow({
    width: preferences.defaultWidth,
    height: preferences.defaultHeight,
    frame: false, // Frameless window
    transparent: true, // Transparent background
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false // Don't show until ready
  });

  // Load the note HTML file
  noteWindow.loadFile(path.join(__dirname, 'note.html'))
    .then(() => {
      console.log('Note window loaded successfully');
    })
    .catch(err => {
      console.error('Error loading note window:', err);
    });

  // When the window is ready to show
  noteWindow.once('ready-to-show', () => {
    noteWindow.show();
    
    // If we have note data, send it to the renderer
    if (noteData) {
      noteWindow.webContents.send('note:load', noteData);
      
      // Set position and size if specified
      if (noteData.position) {
        noteWindow.setPosition(noteData.position.x, noteData.position.y);
      }
      
      if (noteData.size) {
        noteWindow.setSize(noteData.size.width, noteData.size.height);
      }
      
      // Set always on top if the note was pinned
      if (noteData.isPinned) {
        noteWindow.setAlwaysOnTop(true);
      }
    }
  });

  // Track window position changes
  noteWindow.on('moved', () => {
    const position = noteWindow.getPosition();
    noteWindow.webContents.send('note:moved', { x: position[0], y: position[1] });
  });
  
  // Track window size changes
  noteWindow.on('resize', () => {
    const size = noteWindow.getSize();
    noteWindow.webContents.send('note:resized', { width: size[0], height: size[1] });
  });
  
  // Clean up when window is closed
  noteWindow.on('closed', () => {
    if (noteData && noteData.id) {
      console.log(`Note window closed for ID: ${noteData.id}`);
      noteWindows.delete(noteData.id);
      
      // Don't save preferences here, as it will overwrite them every time
      // a single note is closed. We'll save on app quit instead.
    }
  });
  
  return noteWindow;
}

// Create the main window
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Scribble',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Log errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load main window:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log('Renderer console:', message);
  });

  // Load the main HTML file
  mainWindow.loadFile(path.join(__dirname, 'index.html'))
    .then(() => {
      console.log('Main window loaded successfully');
    })
    .catch(err => {
      console.error('Error loading main window:', err);
    });
  
  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();
  
  // When the main window is ready to show
  mainWindow.on('ready-to-show', () => {
    console.log('Main window ready to show');
    mainWindow.show();
  });
  
  return mainWindow;
}

// Load all existing notes from the save directory
function loadExistingNotes() {
  const savePath = ensureSavePath();
  console.log('Loading existing notes with preferences:', JSON.stringify(preferences));
  
  // If we have a list of previously open notes, just open those
  if (preferences.openNotes && Array.isArray(preferences.openNotes) && preferences.openNotes.length > 0) {
    console.log('Opening previously open notes:', preferences.openNotes);
    let notesOpened = 0;
    
    // Open each note that was previously open
    for (const noteId of preferences.openNotes) {
      try {
        const notePath = path.join(savePath, `${noteId}.md`);
        const metadataPath = path.join(savePath, `${noteId}.json`);
        
        console.log(`Checking note ${noteId} at path: ${notePath}`);
        
        // Check if the note still exists
        if (fs.existsSync(notePath)) {
          console.log(`Found note file for ${noteId}, opening it`);
          
          // Get the content
          const content = fs.readFileSync(notePath, 'utf8');
          
          // Get the metadata if it exists
          let metadata = {};
          if (fs.existsSync(metadataPath)) {
            const metadataContent = fs.readFileSync(metadataPath, 'utf8');
            metadata = JSON.parse(metadataContent);
          }
          
          // Create the note data
          const noteData = {
            id: noteId,
            content,
            ...metadata
          };
          
          // Create a window for the note
          const window = createNoteWindow(noteData);
          noteWindows.set(noteId, window);
          notesOpened++;
        } else {
          console.log(`Previously open note ${noteId} no longer exists`);
        }
      } catch (error) {
        console.error(`Error loading previously open note ${noteId}:`, error);
      }
    }
    
    console.log(`Finished opening previously open notes: ${notesOpened} notes opened`);
    return;
  } else {
    console.log('No previously open notes found');
    return; // Don't load any notes if none were previously open
  }
}

// Function to load all notes - extracted from loadExistingNotes
function loadAllNotes(savePath) {
  console.log('Loading all notes from', savePath);
  fs.readdir(savePath, (err, files) => {
    if (err) {
      console.error('Error reading notes directory:', err);
      return;
    }
    
    // Find all markdown files
    const mdFiles = files.filter(file => file.endsWith('.md'));
    console.log(`Found ${mdFiles.length} note files`);
    
    mdFiles.forEach(file => {
      const notePath = path.join(savePath, file);
      
      try {
        // Get the content
        const content = fs.readFileSync(notePath, 'utf8');
        
        // Get the ID from the filename
        const noteId = path.basename(file, '.md');
        
        // Get the metadata if it exists
        let metadata = {};
        const metadataPath = path.join(savePath, `${noteId}.json`);
        
        if (fs.existsSync(metadataPath)) {
          const metadataContent = fs.readFileSync(metadataPath, 'utf8');
          metadata = JSON.parse(metadataContent);
        }
        
        // Create the note data
        const noteData = {
          id: noteId,
          content,
          ...metadata
        };
        
        // Create a window for the note
        const window = createNoteWindow(noteData);
        noteWindows.set(noteId, window);
      } catch (error) {
        console.error(`Error loading note ${file}:`, error);
      }
    });
  });
}

// Save a note to disk
function saveNote(noteId, data) {
  const savePath = ensureSavePath();
  
  try {
    // Save content
    const notePath = path.join(savePath, `${noteId}.md`);
    fs.writeFileSync(notePath, data.content || '');
    
    // Save metadata separately
    const metadataWithoutContent = { ...data };
    delete metadataWithoutContent.content;
    
    const metadataPath = path.join(savePath, `${noteId}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadataWithoutContent, null, 2));
    
    return { id: noteId, ...data };
  } catch (error) {
    console.error(`Error saving note ${noteId}:`, error);
    throw error;
  }
}

// Delete a note
function deleteNote(noteId) {
  const savePath = preferences.savePath;
  
  try {
    // Delete the files
    const notePath = path.join(savePath, `${noteId}.md`);
    const metadataPath = path.join(savePath, `${noteId}.json`);
    
    if (fs.existsSync(notePath)) {
      fs.unlinkSync(notePath);
    }
    
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }
    
    // Close the window if it's open
    if (noteWindows.has(noteId)) {
      const window = noteWindows.get(noteId);
      window.close();
      noteWindows.delete(noteId);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting note ${noteId}:`, error);
    return false;
  }
}

// Register IPC handlers
function registerIpcHandlers() {
  // Note CRUD operations
  ipcMain.handle('notes:create', (event, noteId = null) => {
    // Generate a unique ID if none provided
    const id = noteId || uuidv4();
    
    // Create initial note data
    const noteData = {
      id,
      content: '# New Note\n\nStart typing here...',
      color: '#192734', // Twitter dark mode
      fontColor: '#E7E9EA', // Light text for dark mode
      fontSize: 14,
      fontFamily: 'Arial',
      notebookBg: false,
      updatedAt: new Date().toISOString()
    };
    
    // Save the note
    saveNote(id, noteData);
    
    // Create a window for the note
    const window = createNoteWindow(noteData);
    noteWindows.set(id, window);
    
    return noteData;
  });
  
  ipcMain.handle('notes:update', (event, noteId, data) => {
    // Add updated timestamp
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    return saveNote(noteId, updatedData);
  });
  
  ipcMain.handle('notes:getAll', () => {
    const savePath = ensureSavePath();
    const notes = [];
    
    try {
      const files = fs.readdirSync(savePath);
      
      // Find all markdown files
      files.filter(file => file.endsWith('.md')).forEach(file => {
        const noteId = path.basename(file, '.md');
        const notePath = path.join(savePath, file);
        
        // Get the content
        const content = fs.readFileSync(notePath, 'utf8');
        
        // Get metadata
        let metadata = {};
        const metadataPath = path.join(savePath, `${noteId}.json`);
        
        if (fs.existsSync(metadataPath)) {
          try {
            const metadataContent = fs.readFileSync(metadataPath, 'utf8');
            metadata = JSON.parse(metadataContent);
          } catch (error) {
            console.error(`Error reading metadata for note ${noteId}:`, error);
          }
        }
        
        // Add note to the list
        notes.push({
          id: noteId,
          content,
          ...metadata,
          updatedAt: metadata.updatedAt || fs.statSync(notePath).mtime
        });
      });
      
      return notes;
    } catch (error) {
      console.error('Error getting all notes:', error);
      return [];
    }
  });
  
  ipcMain.handle('notes:delete', (event, noteId) => {
    return deleteNote(noteId);
  });
  
  // Open an existing note
  ipcMain.handle('notes:open', (event, noteId) => {
    // Check if the note window is already open
    if (noteWindows.has(noteId) && !noteWindows.get(noteId).isDestroyed()) {
      // Focus the existing window
      noteWindows.get(noteId).focus();
      return { success: true, id: noteId };
    }
    
    // The note window isn't open, so we need to load the note and create a window
    try {
      const savePath = ensureSavePath();
      const notePath = path.join(savePath, `${noteId}.md`);
      const metadataPath = path.join(savePath, `${noteId}.json`);
      
      // Check if the note exists
      if (!fs.existsSync(notePath)) {
        console.error(`Note ${noteId} not found`);
        return { success: false, error: 'Note not found' };
      }
      
      // Get the content
      const content = fs.readFileSync(notePath, 'utf8');
      
      // Get metadata if it exists
      let metadata = {};
      if (fs.existsSync(metadataPath)) {
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      }
      
      // Create the note data
      const noteData = {
        id: noteId,
        content,
        ...metadata
      };
      
      // Create a window for the note
      const window = createNoteWindow(noteData);
      noteWindows.set(noteId, window);
      
      return { success: true, id: noteId };
    } catch (error) {
      console.error(`Error opening note ${noteId}:`, error);
      return { success: false, error: error.message };
    }
  });
  
  // Settings operations
  ipcMain.handle('settings:getSavePath', () => {
    return preferences.savePath;
  });
  
  ipcMain.handle('settings:setSavePath', (event, newPath) => {
    try {
      // Try to create the directory if it doesn't exist
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath, { recursive: true });
      }
      
      // Update the preference
      preferences.savePath = newPath;
      
      return true;
    } catch (error) {
      console.error('Error setting save path:', error);
      return false;
    }
  });
  
  ipcMain.handle('settings:browseSavePath', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Folder to Save Notes'
    });
    
    if (!result.canceled) {
      return { filePath: result.filePaths[0] };
    }
    
    return null;
  });
  
  // Window operations
  ipcMain.handle('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.minimize();
      return true;
    }
    return false;
  });
  
  ipcMain.handle('window:setAlwaysOnTop', (event, flag) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.setAlwaysOnTop(flag);
      return true;
    }
    return false;
  });

  // Additional handlers for direct API calls
  ipcMain.handle('create-note', () => {
    // Generate a unique ID
    const id = uuidv4();
    
    // Create initial note data
    const noteData = {
      id,
      content: '# New Note\n\nStart typing here...',
      color: '#192734',
      fontColor: '#E7E9EA',
      fontSize: 14,
      fontFamily: 'Arial',
      notebookBg: false,
      updatedAt: new Date().toISOString()
    };
    
    // Save the note
    saveNote(id, noteData);
    
    // Create a window for the note
    const window = createNoteWindow(noteData);
    noteWindows.set(id, window);
    
    return id;
  });

  ipcMain.handle('open-note', (event, noteId) => {
    console.log(`Attempting to open note with ID: ${noteId}`);

    // Check if the note window is already open
    if (noteWindows.has(noteId) && !noteWindows.get(noteId).isDestroyed()) {
      // Focus the existing window
      noteWindows.get(noteId).focus();
      console.log(`Focused existing window for note ${noteId}`);
      return { success: true, id: noteId };
    }
    
    // The note window isn't open, so we need to load the note and create a window
    try {
      const savePath = ensureSavePath();
      const notePath = path.join(savePath, `${noteId}.md`);
      const metadataPath = path.join(savePath, `${noteId}.json`);
      
      // Check if the note exists
      if (!fs.existsSync(notePath)) {
        console.error(`Note ${noteId} not found at path: ${notePath}`);
        return { success: false, error: 'Note not found' };
      }
      
      // Get the content
      const content = fs.readFileSync(notePath, 'utf8');
      
      // Get metadata if it exists
      let metadata = {};
      if (fs.existsSync(metadataPath)) {
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      }
      
      // Create the note data
      const noteData = {
        id: noteId,
        content,
        ...metadata
      };
      
      // Create a window for the note
      const window = createNoteWindow(noteData);
      noteWindows.set(noteId, window);
      console.log(`Created new window for note ${noteId}`);
      
      return { success: true, id: noteId };
    } catch (error) {
      console.error(`Error opening note ${noteId}:`, error);
      return { success: false, error: error.message };
    }
  });
}

// When Electron has initialized and is ready to create browser windows
app.whenReady().then(async () => {
  console.log('App is ready');
  
  // Initialize the quitting flag
  app.isQuitting = false;
  
  // Load saved preferences
  loadPreferences();
  console.log('Loaded preferences with openNotes:', preferences.openNotes);
  
  // Register IPC handlers
  registerIpcHandlers();
  
  // Create the main window but don't automatically load notes
  const mainWindow = createMainWindow();
  
  // Wait for the main window to load before loading notes
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Main window loaded, now loading notes');
    setTimeout(() => {
      loadExistingNotes();
    }, 500); // Small delay to ensure everything is ready
  });
  
  // macOS: Re-create a window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Save open notes and mark app as quitting
app.on('before-quit', () => {
  console.log('Application is quitting, saving open notes...');
  app.isQuitting = true;  // Add a flag to know we're quitting
  saveOpenNotes();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  console.log('All windows closed');
  
  // Save the current state of open notes before closing
  saveOpenNotes();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, save open notes when all windows are closed
app.on('will-quit', () => {
  console.log('Application will quit, final check of open notes');
  app.isQuitting = true;
  
  // Only update preferences if there are still notes open
  // Otherwise, use the previously saved state
  if (noteWindows.size > 0) {
    saveOpenNotes();
  } else {
    console.log('No notes open at quit time, preserving previously saved state');
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
