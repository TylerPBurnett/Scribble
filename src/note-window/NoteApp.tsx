import { useState, useEffect } from 'react'
import './NoteApp.css'
import NoteEditor from './components/NoteEditor'
import { Note } from '../shared/types/Note'
import { getNoteById } from '../shared/services/noteService'
import { initSettings, AppSettings } from '../shared/services/settingsService'
import { ThemeProvider } from '../shared/services/themeService'

function NoteApp() {
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)

  // Load note on startup
  useEffect(() => {
    const loadNote = async () => {
      try {
        console.log('=== NoteApp Initialization Start ===');
        console.log('Window location:', window.location.href);

        // Initialize settings (needed for note operations)
        const settings = await initSettings();
        console.log('NoteApp - Settings initialized:', settings);
        setAppSettings(settings);

        // Get the note ID from the URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const noteIdFromUrl = urlParams.get('noteId');
        console.log('Note ID from URL parameters:', noteIdFromUrl);

        if (!noteIdFromUrl) {
          setError('No note ID provided in URL for NoteApp.');
          setIsLoading(false);
          return;
        }

        // Set up listener for initial note data from main process
        const unsubscribe = window.noteWindow.onInitialNoteData((initialNote) => {
          console.log('Received initial note data from main process:', initialNote);
          setActiveNote(initialNote);
          setIsLoading(false);
          unsubscribe(); // Unsubscribe after receiving data
        });

        // Request transient data if it's a new note that was just opened
        const transientNote = await window.noteWindow.getTransientNewNoteData(noteIdFromUrl);
        if (transientNote && transientNote._isNew) {
          console.log('Got transient new note data on load:', transientNote);
          setActiveNote(transientNote);
          setIsLoading(false);
          unsubscribe(); // Unsubscribe as we found data
          return; // Don't proceed to fetch from disk
        }

        // If no initial/transient data, then attempt to load from disk
        console.log(`Loading existing note with ID: ${noteIdFromUrl} from disk.`);
        const note = await getNoteById(noteIdFromUrl);
        console.log('Loaded note from disk:', note);

        if (note) {
          setActiveNote(note);

          // Set the window's pin state based on the note's pinned property
          if (note.pinned) {
            try {
              await window.windowControls.setPinState(noteIdFromUrl, true);
            } catch (error) {
              console.error('Error setting window pin state:', error);
            }
          }
        } else {
          console.error(`Note with ID ${noteIdFromUrl} not found on disk.`);
          setError(`Note with ID ${noteIdFromUrl} not found. It may have been deleted or moved.`);
        }

        setIsLoading(false);

        // Cleanup on unmount
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error during note loading:', error);
        setError('Failed to load note');
        setIsLoading(false);
      }
    };

    loadNote();
  }, [])

  // Handle note save
  const handleNoteSave = async (updatedNote: Note) => {
    setActiveNote(updatedNote)

    // Get the note ID from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search)
    const noteId = urlParams.get('noteId')

    // Update the window's pin state if the note ID is available
    if (noteId) {
      try {
        await window.windowControls.setPinState(noteId, !!updatedNote.pinned)
      } catch (error) {
        console.error('Error updating window pin state:', error)
      }
    }
  }

  // Handle real-time note changes (for preview updates)
  const handleNoteChange = (updatedNote: Note) => {
    setActiveNote(updatedNote)
    
    // Notify other windows about the real-time changes for preview updates
    // Only send title and content for real-time updates
    window.noteWindow.noteUpdated(updatedNote.id, { 
      title: updatedNote.title, 
      content: updatedNote.content 
    })
  }

  // Show loading state
  if (isLoading) {
    return <div className="note-window loading">Loading note...</div>
  }

  // Show error state
  if (error) {
    return <div className="note-window error">{error}</div>
  }

  // Show note editor
  if (activeNote && appSettings) {
    return (
      <ThemeProvider initialSettings={appSettings}>
        <div className="note-window">
          <NoteEditor 
            note={activeNote} 
            onSave={handleNoteSave} 
            onChange={handleNoteChange}
          />
        </div>
      </ThemeProvider>
    )
  }

  // Fallback
  return <div className="note-window error">Failed to load note</div>
}

export default NoteApp
