import { useState, useEffect, useRef, useCallback } from 'react'
import NoteList from './components/NoteList'
import CollectionTabs from './components/CollectionTabs'
import { SettingsDialog } from '../settings-window/SettingsDialog'
import TitleBar from '../shared/components/TitleBar'
import { Note } from '../shared/types/Note'
import { CollectionWithNoteCount } from '../shared/types/Collection'
import { getNotes, deleteNote } from '../shared/services/noteService'
import { collectionService } from '../shared/services/collectionService'
import { initSettings, saveSettings, AppSettings } from '../shared/services/settingsService'
import { ThemeProvider, useTheme } from '../shared/services/themeService'
import { AppHotkeys } from './components/AppHotkeys'
import { CollectionErrorBoundary } from '../shared/components/CollectionErrorBoundary'
import { AppHeader } from './components/AppHeader'
import { ToastProvider } from '../shared/components/Toast'

function MainApp() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote] = useState<Note | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [appSettings, setAppSettings] = useState<AppSettings>({
    saveLocation: '',
    autoSave: true,
    autoSaveInterval: 5,
    theme: 'dim',
  })

  // Collection state
  const [collections, setCollections] = useState<CollectionWithNoteCount[]>([])
  const [activeCollectionId, setActiveCollectionId] = useState<string>('all')
  const [collectionsInitialized, setCollectionsInitialized] = useState<boolean>(false)

  // Ref for search input to focus it with hotkey
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Define loadAllNotes as a useCallback for reusability and stability
  const [, setIsLoadingNotes] = useState(false);

  const loadAllNotes = useCallback(async () => {
    console.log('MainApp - Loading all notes...');
    setIsLoadingNotes(true);
    try {
      const fetchedNotes = await getNotes();
      setNotes(fetchedNotes);
      console.log(`MainApp - Loaded notes: ${fetchedNotes.length}`);
    } catch (error) {
      console.error('MainApp - Error loading notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  }, []); // No dependencies as getNotes is stable

  // Load collections with note counts
  const loadCollections = useCallback(async () => {
    console.log('MainApp - Loading collections...');
    try {
      // Initialize collections service
      await collectionService.initializeCollections();
      
      // Get collections with note counts
      const collectionsWithCounts = await collectionService.getCollectionsWithCounts(notes);
      setCollections(collectionsWithCounts);
      console.log(`MainApp - Loaded collections: ${collectionsWithCounts.length}`);
    } catch (error) {
      console.error('MainApp - Error loading collections:', error);
    }
  }, [notes]); // Depend on notes to update counts when notes change

  // Initialize collections with session restoration
  const initializeCollectionsWithSession = useCallback(async () => {
    if (collectionsInitialized) return;
    
    console.log('MainApp - Initializing collections with session restoration...');
    try {
      const { activeCollectionId: restoredActiveCollectionId } = 
        await collectionService.initializeCollectionsWithSession();
      
      // Get collections with note counts
      const collectionsWithCounts = await collectionService.getCollectionsWithCounts(notes);
      setCollections(collectionsWithCounts);
      
      // Restore active collection state
      setActiveCollectionId(restoredActiveCollectionId);
      
      setCollectionsInitialized(true);
      console.log(`MainApp - Collections initialized with session: ${collectionsWithCounts.length} collections, active: ${restoredActiveCollectionId}`);
    } catch (error) {
      console.error('MainApp - Error initializing collections with session:', error);
      // Fallback to basic initialization
      await loadCollections();
      setCollectionsInitialized(true);
    }
  }, [notes, collectionsInitialized, loadCollections]);

  // Subscribe to real-time collection updates
  useEffect(() => {
    console.log('MainApp - Setting up collection update subscription');
    
    const unsubscribe = collectionService.subscribeToUpdates((updatedCollections) => {
      console.log('MainApp - Received collection update:', updatedCollections.length, 'collections');
      
      // Only update if collections actually changed to prevent unnecessary re-renders
      setCollections(prevCollections => {
        // Quick check if collections changed
        if (prevCollections.length !== updatedCollections.length) {
          return updatedCollections;
        }
        
        // Check if any collection counts changed
        const hasChanges = updatedCollections.some((newCol, index) => {
          const oldCol = prevCollections[index];
          return !oldCol || oldCol.noteCount !== newCol.noteCount || oldCol.name !== newCol.name;
        });
        
        return hasChanges ? updatedCollections : prevCollections;
      });
    });

    return () => {
      console.log('MainApp - Cleaning up collection update subscription');
      unsubscribe();
    };
  }, []); // No dependencies - this subscription should persist

  // Cleanup collection service on unmount
  useEffect(() => {
    return () => {
      console.log('MainApp - Cleaning up collection service');
      collectionService.cleanup();
    };
  }, []);

  // Load settings and initial notes on startup
  useEffect(() => {
    const init = async () => {
      try {
        console.log('=== MainApp Initialization Start ===');

        // Initialize settings
        console.log('MainApp - Initializing settings...')
        const settings = await initSettings()
        console.log('MainApp - Settings initialized:', settings)
        setAppSettings(settings)

        // Load notes for the main window
        console.log('This is the main window, loading all notes')
        await loadAllNotes();
      } catch (error) {
        console.error('Error during initialization:', error)
      }
    }

    init()
  }, [loadAllNotes]) // Add loadAllNotes as a dependency

  // Initialize collections with session restoration when notes are loaded
  useEffect(() => {
    if (notes.length >= 0 && !collectionsInitialized) { // Initialize collections with session restoration
      initializeCollectionsWithSession();
    } else if (collectionsInitialized) {
      // If already initialized, just update counts
      loadCollections();
    }
  }, [notes, collectionsInitialized, initializeCollectionsWithSession, loadCollections]);

  // Listen for note updates from other windows using the new API
  useEffect(() => {
    console.log('MainApp - Setting up note update listener');

    // Subscribe to note updates using the new API
    const unsubscribe = window.noteWindow.onNoteUpdated((noteId, updatedProperties) => {
      console.log(`MainApp - Received note-updated event for ID: ${noteId}, Properties:`, updatedProperties);

      // If we have the updated properties, update the note in the current state immediately
      if (updatedProperties && Object.keys(updatedProperties).length > 0) {
        // Handle deleted notes
        if (updatedProperties.deleted) {
          console.log('MainApp - Handling deleted note:', noteId)
          setNotes(prevNotes => {
            const updatedNotes = prevNotes.filter(note => note.id !== noteId);
            
            // Notify collection service about the deleted note (immediate update)
            collectionService.handleNoteDeleted(noteId, updatedNotes);
            
            return updatedNotes;
          });
        } else {
          // Update existing notes
          console.log('MainApp - Updating note with properties:', updatedProperties)
          setNotes(prevNotes => {
            const updatedNotes = prevNotes.map(note => {
              if (note.id === noteId) {
                const updatedNote = { ...note, ...updatedProperties };
                console.log('MainApp - Note before update:', note)
                console.log('MainApp - Note after update:', updatedNote)
                return updatedNote;
              }
              return note;
            });
            
            // Only notify collection service for updates that might affect collection counts
            // Skip notifications for frequent content updates (like typing)
            const shouldNotifyCollections = updatedProperties.title !== undefined || 
                                          updatedProperties.deleted !== undefined ||
                                          updatedProperties.favorite !== undefined;
            
            if (shouldNotifyCollections) {
              // Notify collection service about note updates (with debouncing)
              collectionService.notifyCollectionUpdates(updatedNotes, false);
            }
            
            return updatedNotes;
          });
        }
      } else {
        // Only reload all notes from file system if no specific properties were provided
        console.log('MainApp - No specific properties provided, reloading all notes')
        loadAllNotes();
      }
    });

    // Clean up the listener when the component unmounts
    return () => {
      console.log('MainApp - Cleaning up note update listener');
      unsubscribe();
    };
  }, [loadAllNotes]) // Add loadAllNotes as a dependency

  // Filter notes based on active collection and search query
  const filteredNotes = notes.filter(note => {
    // First filter by collection
    const activeCollection = collections.find(c => c.id === activeCollectionId);
    let passesCollectionFilter = true;
    
    if (activeCollection && !activeCollection.isDefault) {
      // For non-default collections, only show notes that belong to this collection
      passesCollectionFilter = activeCollection.noteIds.includes(note.id);
    }
    // For default "All" collection, show all notes (passesCollectionFilter remains true)
    
    if (!passesCollectionFilter) return false;

    // Then filter by search query
    if (!searchQuery) return true;

    const lowerQuery = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery)
    );
  })

  // Handle note click
  const handleNoteClick = async (note: Note) => {
    // Open the note in a new window
    await window.noteWindow.openNote(note.id)
  }

  // Handle creating a new note
  const handleNewNote = async () => {
    try {
      console.log('MainApp - Creating new note...');

      // Get a new note object from the main process with a UUID
      const newNote = await window.noteWindow.createNote();
      console.log('MainApp - New note created with data:', newNote);

      if (newNote && newNote.id) {
        // Add the new note to the local state immediately for a responsive UI
        setNotes(prevNotes => {
          const updatedNotes = [newNote, ...prevNotes];
          
          // Notify collection service about the new note (with debouncing)
          collectionService.handleNoteCreated(newNote.id, updatedNotes);
          
          return updatedNotes;
        });

        // If we're in a specific collection (not "All Notes"), add the note to that collection
        if (activeCollectionId !== 'all') {
          try {
            // Use the new collection service method that handles count updates
            await collectionService.handleNoteAddedToCollection(activeCollectionId, newNote.id, [newNote, ...notes]);
            console.log(`MainApp - Added new note to collection: ${activeCollectionId}`);
          } catch (error) {
            console.error('MainApp - Error adding note to collection:', error);
          }
        }

        // Pass the newNote object directly to openNote
        await window.noteWindow.openNote(newNote.id, newNote);
        console.log('MainApp - Note window opened with initial data');

        // Broadcast the new note to other windows
        window.noteWindow.noteUpdated(newNote.id, newNote);
      } else {
        console.error('MainApp - Failed to create new note, no valid data returned');
      }
    } catch (error) {
      console.error('MainApp - Error during new note creation or opening:', error);
      // Reload all notes to ensure consistency
      loadAllNotes();
    }
  }

  // Handle opening settings
  const handleOpenSettings = () => {
    setShowSettings(true)
  }

  // Handle saving settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    console.log('MainApp - Saving new settings:', newSettings)
    setAppSettings(newSettings)
    saveSettings(newSettings)
    console.log('MainApp - Settings saved, current state:', newSettings)
  }

  // Handle toggling dark mode
  const handleToggleDarkMode = () => {
    // Get the current theme
    const currentTheme = appSettings.theme || 'dim';

    // Toggle between light and dim themes
    const newTheme = currentTheme === 'light' ? 'dim' : 'light';

    const newSettings = {
      ...appSettings,
      theme: newTheme
    };
    setAppSettings(newSettings);
    saveSettings(newSettings);
    console.log('Theme toggled to:', newTheme);
  }

  // Handle focusing search input
  const handleFocusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }

  // Handle note deletion
  const handleNoteDelete = async (noteId: string) => {
    console.log('MainApp - Deleting note:', noteId)
    try {
      // Delete the note using the service
      await deleteNote(noteId)
      console.log('MainApp - Note deleted from storage')

      // Update the local state immediately for a responsive UI
      setNotes(prevNotes => {
        const updatedNotes = prevNotes.filter(note => note.id !== noteId);
        
        // Notify collection service about the deleted note (immediate update)
        collectionService.handleNoteDeleted(noteId, updatedNotes);
        
        return updatedNotes;
      });

      // Notify other windows that this note has been deleted
      // Use the deleted flag to indicate this is a deletion
      window.noteWindow.noteUpdated(noteId, { deleted: true })
      console.log('MainApp - Note deletion complete and broadcast to other windows')
    } catch (error) {
      console.error('MainApp - Error deleting note:', error)
      // Reload all notes to ensure consistency
      loadAllNotes()
    }
  }

  // Handle collection change
  const handleCollectionChange = async (collectionId: string) => {
    console.log('MainApp - Changing active collection to:', collectionId);
    setActiveCollectionId(collectionId);
    
    // Save active collection state for session restoration
    try {
      await collectionService.saveActiveCollectionState(collectionId);
    } catch (error) {
      console.error('MainApp - Error saving active collection state:', error);
      // Don't throw error - this is not critical for app functionality
    }
  }



  // Render the main window
  return (
    <ThemeProvider initialSettings={appSettings}>
      <ToastProvider>
        <div className="app-container flex flex-col h-screen text-text font-twitter">
        {/* Title Bar - Now spans the full width */}
        <TitleBar
          title=""
          onMinimize={() => window.windowControls.minimize()}
          onMaximize={() => window.windowControls.maximize()}
          onClose={() => window.windowControls.close()}
          className="bg-background-titlebar"
        />

        {/* Content area - main content */}
        <div className="content-area flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="main-content main-content-transparent flex flex-col w-full overflow-hidden">

          {/* Header */}
          <AppHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNewNote={handleNewNote}
            onOpenSettings={handleOpenSettings}
            searchInputRef={searchInputRef}
          />

          {/* Collection Tabs */}
          <CollectionErrorBoundary>
            <CollectionTabs
              notes={notes}
              activeCollectionId={activeCollectionId}
              onCollectionChange={handleCollectionChange}
              onCollectionsUpdate={loadCollections}
            />
          </CollectionErrorBoundary>

          {/* Main Content */}
          <NoteList
            notes={filteredNotes}
            onNoteClick={handleNoteClick}
            activeNoteId={activeNote?.id}
            onNoteDelete={handleNoteDelete}
            onCollectionUpdate={loadCollections}
            activeCollectionId={activeCollectionId}
            activeCollectionName={collections.find(c => c.id === activeCollectionId)?.name}
            allNotes={notes}
          />
        </div>
        </div>

        {/* Settings Modal */}
        <SettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          initialSettings={appSettings}
          onSave={handleSaveSettings}
        />

        {/* Global Hotkeys */}
        <AppHotkeys
          settings={appSettings}
          onNewNote={handleNewNote}
          onOpenSettings={handleOpenSettings}
          onSearch={handleFocusSearch}
          onToggleDarkMode={handleToggleDarkMode}
        />
      </div>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default MainApp
