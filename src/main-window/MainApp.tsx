import { useState, useEffect, useRef, useCallback } from 'react'
import SelectableNotesList from './components/SelectableNotesList'
import CollectionTabs from './components/CollectionTabs'

import TitleBar from '../shared/components/TitleBar'
import { Note } from '../shared/types/Note'
import { CollectionWithNoteCount } from '../shared/types/Collection'
import { getNotes, deleteNote } from '../shared/services/noteService'
import { collectionService } from '../shared/services/collectionService'
import { initSettings, saveSettings, AppSettings, subscribeToSettingsChanges } from '../shared/services/settingsService'
import { ThemeProvider } from '../shared/services/themeService'
import { AppHotkeys } from './components/AppHotkeys'
import { HotkeyDebug } from './components/HotkeyDebug'
import { CollectionErrorBoundary } from '../shared/components/CollectionErrorBoundary'
import { CompactToolbar } from './components/CompactToolbar'
import { ToastProvider } from '../shared/components/Toast'
import PerformanceDashboard from '../shared/components/PerformanceDashboard'
import { usePerformanceDashboard } from '../shared/hooks/usePerformanceDashboard'
import '../shared/scripts/validatePerformance'

function MainApp() {
  // Performance dashboard
  const { isVisible: isDashboardVisible, hideDashboard } = usePerformanceDashboard();

  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote, setActiveNote] = useState<Note | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  // Initialize settings with null to indicate loading state
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)

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
    console.log('🔥 [MainApp] FORCE initializing collections - ignoring collectionsInitialized flag');
    console.log('🔍 [MainApp] collectionsInitialized was:', collectionsInitialized);
    
    // TEMPORARILY ignore the flag to force initialization
    // if (collectionsInitialized) return;
    
    console.log('🚀 [MainApp] Starting collections initialization with session restoration...');
    try {
      const { activeCollectionId: restoredActiveCollectionId } = 
        await collectionService.initializeCollectionsWithSession();
      
      // Get collections with note counts
      const collectionsWithCounts = await collectionService.getCollectionsWithCounts(notes);
      setCollections(collectionsWithCounts);
      
      // Restore active collection state
      setActiveCollectionId(restoredActiveCollectionId);
      
      setCollectionsInitialized(true);
      console.log(`✅ [MainApp] Collections initialized with session: ${collectionsWithCounts.length} collections, active: ${restoredActiveCollectionId}`);
    } catch (error) {
      console.error('❌ [MainApp] Error initializing collections with session:', error);
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

  // Load settings synchronously on first render to prevent theme flicker
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
        // If initialization fails, set default settings
        setAppSettings({
          saveLocation: '',
          autoSave: true,
          autoSaveInterval: 5,
          theme: 'dim',
        })
      }
    }

    init()
  }, [loadAllNotes]) // Add loadAllNotes as a dependency

  // Subscribe to settings changes
  useEffect(() => {
    console.log('MainApp - Setting up settings change subscription');
    const unsubscribe = subscribeToSettingsChanges((newSettings) => {
      console.log('MainApp - Settings changed:', newSettings);
      
      // Check if save location changed
      if (appSettings && newSettings.saveLocation !== appSettings.saveLocation) {
        console.log('MainApp - Save location changed from', appSettings.saveLocation, 'to', newSettings.saveLocation);
        // Refresh notes and collections when save location changes
        loadAllNotes().then(() => {
          console.log('MainApp - Notes refreshed after save location change');
        }).catch(error => {
          console.error('MainApp - Error refreshing notes after save location change:', error);
        });
      }
      
      setAppSettings(newSettings);
    });

    // Also listen for settings changes from other windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app_settings' && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          console.log('MainApp - Settings changed from another window:', newSettings);
          
          // Check if save location changed
          if (appSettings && newSettings.saveLocation !== appSettings.saveLocation) {
            console.log('MainApp - Save location changed from another window from', appSettings.saveLocation, 'to', newSettings.saveLocation);
            // Refresh notes and collections when save location changes
            loadAllNotes().then(() => {
              console.log('MainApp - Notes refreshed after save location change from another window');
            }).catch(error => {
              console.error('MainApp - Error refreshing notes after save location change from another window:', error);
            });
          }
          
          setAppSettings(newSettings);
        } catch (error) {
          console.error('Error parsing settings from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      console.log('MainApp - Cleaning up settings change subscription');
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAllNotes, appSettings]);

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

  // Listen for refresh-notes-list events from main process
  useEffect(() => {
    console.log('🎯 [MainApp] Setting up refresh-notes-list listener');

    const handleRefreshNotesList = async () => {
      console.log('🔄 [MainApp] Received refresh-notes-list event');
      console.log('🔄 [MainApp] Current notes count before refresh:', notes.length);
      try {
        await loadAllNotes();
        console.log('✅ [MainApp] Notes list refreshed successfully');
      } catch (error) {
        console.error('❌ [MainApp] Error refreshing notes list:', error);
      }
    };

    // Add IPC event listener
    window.ipcRenderer.on('refresh-notes-list', handleRefreshNotesList);

    // Clean up
    return () => {
      console.log('🎯 [MainApp] Cleaning up refresh-notes-list listener');
      window.ipcRenderer.off('refresh-notes-list', handleRefreshNotesList);
    };
  }, [loadAllNotes, notes.length])


  // Filter notes based on active collection and search query
  const filteredNotes = notes.filter(note => {
    // First filter by collection
    const activeCollection = collections.find(c => c.id === activeCollectionId);
    let passesCollectionFilter = true;
    
    console.log('🔍 [MainApp] Filtering note:', note.title, 'ActiveCollectionId:', activeCollectionId, 'Found collection:', activeCollection?.name);
    
    if (activeCollection && !activeCollection.isDefault) {
      // For non-default collections, only show notes that belong to this collection
      passesCollectionFilter = note.id ? activeCollection.noteIds.includes(note.id) : false;
      console.log('🔍 [MainApp] Note passes collection filter:', passesCollectionFilter, 'Note ID:', note.id, 'Collection noteIds:', activeCollection.noteIds);
    } else if (!activeCollection) {
      console.log('❌ [MainApp] Active collection not found! Available collections:', collections.map(c => ({ id: c.id, name: c.name })));
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
    if (note.id) {
      await window.noteWindow.openNote(note.id);
    }
  }

  // Handle creating a new note
  const handleNewNote = async () => {
    try {
      console.log('🆕 [MainApp] Creating new note...');
      console.log('🆕 [MainApp] Current notes count before creation:', notes.length);

      // Get a new note object from the main process with a UUID, passing current save location
      const newNote = await window.noteWindow.createNote(appSettings?.saveLocation || '');
      console.log('🆕 [MainApp] New note created with data:', newNote);
      console.log('🆕 [MainApp] Waiting for refresh event from main process...');

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

        // The main process already opens the note window, so we don't need to call openNote here
        console.log('MainApp - Note window should already be open from main process');

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
    console.log('Opening settings window')
    window.settings.openSettings()
  }

  // Handle toggling dark mode
  const handleToggleDarkMode = () => {
    if (!appSettings) return;
    
    // Get the current theme
    const currentTheme = appSettings.theme || 'dim';

    // Toggle between light and dim themes
    const newTheme: 'light' | 'dim' = currentTheme === 'light' ? 'dim' : 'light';

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
    // Open the search command dialog instead of focusing the input
    setSearchOpen(true);
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

  // Handle bulk note deletion
  const handleBulkDelete = async (selectedTitles: string[]) => {
    console.log('MainApp - Handling bulk note deletion:', selectedTitles);
    
    try {
      // Find notes by title and delete them
      const notesToDelete = notes.filter(note => selectedTitles.includes(note.title));
      
      for (const note of notesToDelete) {
        if (!note.id) continue;
        console.log('MainApp - Deleting note:', note.id);
        await deleteNote(note.id);
        // Notify other windows that this note has been deleted
        window.noteWindow.noteUpdated(note.id, { deleted: true });
      }
      
      console.log('MainApp - Bulk deletion completed');
      
      // Remove deleted notes from state
      const deletedIds = notesToDelete.map(note => note.id);
      setNotes(prevNotes => {
        const updatedNotes = prevNotes.filter(note => note.id && !deletedIds.includes(note.id));
        
        // Notify collection service about deleted notes
        deletedIds.forEach(id => {
          if (id) collectionService.handleNoteDeleted(id, updatedNotes);
        });
        
        return updatedNotes;
      });
      
      // Reset active note if it was deleted
      if (activeNote && activeNote.id && deletedIds.includes(activeNote.id)) {
        setActiveNote(null);
      }
      
    } catch (error) {
      console.error('MainApp - Error in bulk deletion:', error);
      // Reload all notes to ensure consistency
      loadAllNotes();
      throw error;
    }
  };

  // Handle bulk move to collection
  const handleBulkMoveToCollection = async (selectedTitles: string[], targetCollectionId: string) => {
    console.log('MainApp - Handling bulk move to collection:', selectedTitles, targetCollectionId);
    
    try {
      // Find notes by title
      const notesToMove = notes.filter(note => selectedTitles.includes(note.title));
      
      for (const note of notesToMove) {
        // Remove from current collection if it's not 'all'
        if (activeCollectionId && activeCollectionId !== 'all' && note.id) {
          await collectionService.removeNoteFromCollection(activeCollectionId, note.id);
        }
        
        // Add to target collection
        if (targetCollectionId !== 'all' && note.id) {
          await collectionService.addNoteToCollection(targetCollectionId, note.id);
        }
      }
      
      console.log('MainApp - Bulk move completed');
      
      // Refresh collections and notes
      await loadCollections();
      await loadAllNotes();
      
    } catch (error) {
      console.error('MainApp - Error in bulk move:', error);
      throw error;
    }
  };

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

  // Listen for switch-to-collection events from tray menu
  useEffect(() => {
    console.log('🎯 [MainApp] Setting up switch-to-collection listener');

    const handleSwitchToCollection = async (collectionId: string) => {
      console.log('🔄 [MainApp] Received switch-to-collection event for:', collectionId);
      try {
        await handleCollectionChange(collectionId);
        console.log('✅ [MainApp] Collection switched successfully to:', collectionId);
      } catch (error) {
        console.error('❌ [MainApp] Error switching collection:', error);
      }
    };

    // Add IPC event listener
    window.ipcRenderer.on('switch-to-collection', handleSwitchToCollection);

    // Clean up
    return () => {
      console.log('🎯 [MainApp] Cleaning up switch-to-collection listener');
      window.ipcRenderer.off('switch-to-collection', handleSwitchToCollection);
    };
  }, [handleCollectionChange])

  // Handle search open/close
  const [isSearchOpen, setSearchOpen] = useState(false);



  // Don't render until settings are loaded to prevent theme flicker
  if (!appSettings) {
    return (
      <div className="app-container flex flex-col h-screen items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  // Render the main window
  return (
    <ThemeProvider initialSettings={appSettings}>
      <ToastProvider>
        <div className="app-container flex flex-col h-screen text-text font-twitter">
        {/* Unified Title Bar with integrated toolbar */}
        <TitleBar
          title=""
          onMinimize={() => window.windowControls.minimize()}
          onMaximize={() => window.windowControls.maximize()}
          onClose={() => window.windowControls.close()}
          className="bg-background-titlebar"
        >
          <CompactToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNewNote={handleNewNote}
            onOpenSettings={handleOpenSettings}
            searchInputRef={searchInputRef}
            notes={notes}
            onNoteClick={handleNoteClick}
            isSearchOpen={isSearchOpen}
            onSearchOpenChange={setSearchOpen}
            collections={collections}
            activeCollectionId={activeCollectionId}
          />
        </TitleBar>

        {/* Content area - main content */}
        <div className="content-area flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="main-content main-content-transparent flex flex-col w-full overflow-hidden">

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
          <SelectableNotesList
            notes={filteredNotes}
            onNoteClick={handleNoteClick}
            activeNoteId={activeNote?.id}
            onNoteDelete={handleNoteDelete}
            onCollectionUpdate={loadAllNotes}
            activeCollectionId={activeCollectionId}
            activeCollectionName={collections.find(c => c.id === activeCollectionId)?.name}
            allNotes={notes}
            onNewNote={handleNewNote}
            onBulkDelete={handleBulkDelete}
            onBulkMoveToCollection={handleBulkMoveToCollection}
            availableCollections={collections.map(c => ({ id: c.id, name: c.name }))}
          />
        </div>
        </div>



        {/* Global Hotkeys */}
        <AppHotkeys
          settings={appSettings}
          onNewNote={handleNewNote}
          onOpenSettings={handleOpenSettings}
          onSearch={handleFocusSearch}
          onToggleDarkMode={handleToggleDarkMode}
        />
        
        {/* Hotkey Debug */}
        <HotkeyDebug settings={appSettings} />

        {/* Performance Dashboard (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <PerformanceDashboard
            isVisible={isDashboardVisible}
            onClose={hideDashboard}
            autoRefresh={true}
            refreshInterval={2000}
          />
        )}
      </div>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default MainApp
