// IPC handlers
ipcMain.handle('create-note', () => {
  console.log("create-note handler called");
  try {
    const noteId = uuidv4();
    console.log(`Generated new note ID: ${noteId}`);
    
    createNoteWindow(noteId);
    console.log(`Note window created for ID: ${noteId}`);
    
    return noteId;
  } catch (error) {
    console.error("Error in create-note handler:", error);
    throw error;
  }
});

ipcMain.handle('open-note', (event, noteId) => {
  // Check if note window is already open
  if (noteWindows.has(noteId)) {
    const existingWindow = noteWindows.get(noteId);
    if (!existingWindow.isDestroyed()) {
      existingWindow.focus();
      return noteId;
    }
  }
  
  // If not open, create a new window for this note
  createNoteWindow(noteId);
  return noteId;
}); 