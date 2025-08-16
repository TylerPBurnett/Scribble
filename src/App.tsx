import { useState, useEffect } from 'react'
import './App.css'
import NoteList from './components/NoteList'
import NoteEditor from './components/NoteEditor'
import SettingsWindow from './settings-window/SettingsWindow'
import TitleBar from './components/TitleBar'
import { Note } from './shared/types/Note'
import { getNotes, createNote, getNoteById, deleteNote } from './shared/services/noteService'
import { getSettings, saveSettings, initSettings, AppSettings } from './shared/services/settingsService'

function App() {
  // Check if this is a note window using the window flag
  // This flag is set in note.html before React loads
  const isNoteWindowFlag = !!(window as any).IS_NOTE_WINDOW;
  console.log('Initial check - Is note window (via window flag):', isNoteWindowFlag);

  // Check if this is a settings window using the window flag
  const isSettingsWindowFlag = !!(window as any).IS_SETTINGS_WINDOW;
  console.log('Initial check - Is settings window (via window flag):', isSettingsWindowFlag);

  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [isNoteWindow, setIsNoteWindow] = useState(isNoteWindowFlag)
  const [isSettingsWindow, setIsSettingsWindow] = useState(isSettingsWindowFlag)
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [appSettings, setAppSettings] = useState<AppSettings>({
    saveLocation: '',
    autoSave: true,
    autoSaveInterval: 5,
    darkMode: true,
  })

  // Load notes and settings on startup
  useEffect(() => {
    const init = async () => {
      try {
        console.log('=== App Initialization Start ===');
        console.log('Window location:', window.location.href);
        console.log('Session storage contents:', { ...sessionStorage });

        // Initialize settings
        console.log('App.tsx - Initializing settings...')
        const settings = await initSettings()
        console.log('App.tsx - Settings initialized:', settings)
        setAppSettings(settings)

        // We've already set the window type flags at the component level
        // Now we just need to handle the specific initialization for each window type

        // If this is a settings window, we don't need to do anything else
        if (isSettingsWindow) {
          console.log('This is a settings window, initialization complete')
          return
        }

        // If this is a note window, get the note ID from the URL
        let noteId = null
        if (isNoteWindow) {
          // Get the note ID from the URL query parameters
          const urlParams = new URLSearchParams(window.location.search)
          noteId = urlParams.get('noteId')
          console.log('Note ID from URL parameters:', noteId)

          // Log detailed window information for debugging
          console.log('Window object:', {
            location: window.location.href,
            isNoteWindow: (window as any).IS_NOTE_WINDOW,
            search: window.location.search,
            pathname: window.location.pathname
          })
        }

        if (noteId) {
          console.log('This is a note window for note ID:', noteId)
          setIsNoteWindow(true)

          // Store the noteId in session storage for persistence across refreshes
          sessionStorage.setItem('currentNoteId', noteId)
          console.log('Stored noteId in session storage:', noteId)

          if (noteId.startsWith('new-')) {
            // Create a new note
            console.log('Creating new note for new window')
            const newNote = await createNote()
            console.log('New note created in note window:', newNote)
            setActiveNote(newNote)
          } else {
            // Load existing note
            console.log('Loading existing note with ID:', noteId)
            const note = await getNoteById(noteId)
            console.log('Loaded note:', note)
            if (note) {
              setActiveNote(note)
            } else {
              console.error('Note not found with ID:', noteId)
              // If the note can't be found, it might be a stale reference
              // Show an error message to the user
              console.log('Note with ID', noteId, 'could not be found. It may have been deleted or moved.')
            }
          }
        } else {
          // Load notes for the main window
          console.log('This is the main window, loading all notes')

          // Clear any stored noteId from session storage
          // This ensures we don't accidentally treat the main window as a note window after a refresh
          sessionStorage.removeItem('currentNoteId')
          console.log('Cleared noteId from session storage')

          try {
            const loadedNotes = await getNotes()
            console.log('Loaded notes:', loadedNotes.length)
            setNotes(loadedNotes)
          } catch (error) {
            console.error('Error loading notes:', error)
          }
        }
      } catch (error) {
        console.error('Error during initialization:', error)
      }
    }

    init()
  }, [])

  // Listen for note updates from other windows
  useEffect(() => {
    console.log('🎯 [Frontend] Setting up event listeners, isNoteWindow:', isNoteWindow);
    
    // Skip this in note windows
    if (isNoteWindow) {
      console.log('🎯 [Frontend] Skipping event listeners - this is a note window');
      return;
    }
    
    console.log('🎯 [Frontend] This is the main window - setting up event listeners');

    // Set up listener for note updates
    const handleNoteUpdated = async (_event: any, noteId: string) => {
      console.log('Note updated:', noteId)
      // Reload all notes from file system
      try {
        const updatedNotes = await getNotes()
        setNotes(updatedNotes)
      } catch (error) {
        console.error('Error reloading notes after update:', error)
      }
    }

    // Set up listener for removing unsaved notes
    const handleRemoveUnsavedNote = (_event: any, noteId: string) => {
      console.log('Removing unsaved note from list:', noteId)
      // Remove the unsaved note from the local state
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId))
    }

    // Set up listener for full notes list refresh
    const handleRefreshNotesList = async () => {
      console.log('🔄 [Frontend] Received refresh-notes-list event')
      console.log('🔄 [Frontend] Current notes count before refresh:', notes.length)
      try {
        const updatedNotes = await getNotes()
        setNotes(updatedNotes)
        console.log('✅ [Frontend] Notes list refreshed successfully, new count:', updatedNotes.length)
        console.log('✅ [Frontend] Updated notes:', updatedNotes.map(n => ({ title: n.title, id: n.id })))
      } catch (error) {
        console.error('❌ [Frontend] Error refreshing notes list:', error)
      }
    }

    // Add event listeners
    console.log('🎯 [Frontend] Adding IPC event listeners...');
    window.ipcRenderer.on('note-updated', handleNoteUpdated)
    window.ipcRenderer.on('remove-unsaved-note', handleRemoveUnsavedNote)
    window.ipcRenderer.on('refresh-notes-list', handleRefreshNotesList)
    console.log('🎯 [Frontend] Event listeners added successfully');

    // Clean up
    return () => {
      window.ipcRenderer.off('note-updated', handleNoteUpdated)
      window.ipcRenderer.off('remove-unsaved-note', handleRemoveUnsavedNote)
      window.ipcRenderer.off('refresh-notes-list', handleRefreshNotesList)
    }
  }, [isNoteWindow])

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true

    const lowerQuery = searchQuery.toLowerCase()
    return (
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery)
    )
  })

  // Handle note click
  const handleNoteClick = async (note: Note) => {
    // Open the note in a new window
    await window.noteWindow.openNote(note.id)
  }

  // Handle creating a new note
  const handleNewNote = async () => {
    try {
      // Create a new note via IPC which returns the note with UUID
      console.log('🆕 [Frontend] Creating new note via IPC...')
      const newNote = await window.noteWindow.createNote()
      console.log('🆕 [Frontend] New note created via IPC:', newNote)
      
      // The note window will open automatically from the main process
      // The main process should broadcast a refresh event that we'll receive
    } catch (error) {
      console.error('❌ [Frontend] Error creating new note:', error)
    }
  }

  // Manual refresh for testing
  const handleManualRefresh = async () => {
    console.log('🔄 [Frontend] Manual refresh triggered');
    try {
      const updatedNotes = await getNotes()
      setNotes(updatedNotes)
      console.log('✅ [Frontend] Manual refresh complete, notes count:', updatedNotes.length)
    } catch (error) {
      console.error('❌ [Frontend] Manual refresh failed:', error)
    }
  }

  // Handle opening settings
  const handleOpenSettings = () => {
    setShowSettings(true)
  }

  // Handle saving settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    console.log('App.tsx - Saving new settings:', newSettings)
    setAppSettings(newSettings)
    saveSettings(newSettings)
    console.log('App.tsx - Settings saved, current state:', newSettings)
  }

  // Handle note save (for the note window)
  const handleNoteSave = (updatedNote: Note) => {
    setActiveNote(updatedNote)
    // Update the note in the notes list
    setNotes(prevNotes =>
      prevNotes.map(note =>
        note.id === updatedNote.id ? updatedNote : note
      )
    )
  }

  // Handle note deletion
  const handleNoteDelete = async (noteId: string) => {
    console.log('Deleting note:', noteId)
    // Delete the note using the service
    await deleteNote(noteId)
    console.log('Note deleted from storage')

    // Update the notes list by reloading from file system
    try {
      const updatedNotes = await getNotes()
      setNotes(updatedNotes)
    } catch (error) {
      console.error('Error reloading notes after deletion:', error)
      // Fallback to filtering the current notes list
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId))
    }

    // Notify other windows that this note has been deleted
    window.noteWindow.noteUpdated(noteId)
    console.log('Note deletion complete')
  }

  // Render the settings window
  if (isSettingsWindow) {
    // Don't render anything until settings are fully loaded
    if (!appSettings.saveLocation) {
      return null;
    }

    return (
      <div className="settings-window-container ready">
        <SettingsWindow
          onClose={() => window.close()}
          initialSettings={appSettings}
          onSave={handleSaveSettings}
        />
      </div>
    )
  }

  // Render the note window
  if (isNoteWindow && activeNote) {
    return (
      <div className="note-window">
        <NoteEditor note={activeNote} onSave={handleNoteSave} />
      </div>
    )
  }

  // Render the main window
  return (
    <div className="app">
      <TitleBar
        title="Scribble"
        onMinimize={() => window.windowControls.minimize()}
        onMaximize={() => window.windowControls.maximize()}
        onClose={() => window.windowControls.close()}
      />
      <div className="app-actions">
        <button className="new-note-btn" onClick={handleNewNote}>
          <span className="plus-icon">+</span> New Note
        </button>
        <button className="refresh-btn" onClick={handleManualRefresh} style={{marginLeft: '10px', padding: '8px 12px', fontSize: '12px'}}>
          🔄 Refresh
        </button>
        <button className="settings-btn" onClick={handleOpenSettings}>
          <span className="settings-icon">⚙</span> Settings
        </button>
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <main className="app-content">
        <NoteList
          notes={filteredNotes}
          onNoteClick={handleNoteClick}
          activeNoteId={activeNote?.id}
          onNoteDelete={handleNoteDelete}
        />
      </main>

      <footer className="app-footer">
        <div className="save-location">Save location: {appSettings.saveLocation}</div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsWindow
          onClose={() => setShowSettings(false)}
          initialSettings={appSettings}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  )
}

export default App
