import { Collection, CollectionCreateInput, CollectionUpdateInput, CollectionWithNoteCount } from '../types/Collection';
import { Note } from '../types/Note';
import { getSettings } from './settingsService';
import { v4 as uuidv4 } from 'uuid';

// Default collections that are always available
const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: 'all',
    name: 'All Notes',
    description: 'All your notes in one place',
    createdAt: new Date(),
    updatedAt: new Date(),
    noteIds: [],
    isDefault: true,
    sortOrder: 0
  }
];

// In-memory cache for collections
let collectionsCache: Collection[] | null = null;

// Debounce timer for collection updates
let updateDebounceTimer: NodeJS.Timeout | null = null;

// Collection update listeners for real-time updates
type CollectionUpdateListener = (collections: CollectionWithNoteCount[]) => void;
const collectionUpdateListeners: Set<CollectionUpdateListener> = new Set();

// Helper function to validate collection data
const validateCollectionData = (data: any): data is Collection => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    Array.isArray(data.noteIds) &&
    data.noteIds.every((id: any) => typeof id === 'string')
  );
};

// Helper function to sanitize collection data
const sanitizeCollection = (collection: any): Collection => {
  return {
    id: collection.id || uuidv4(),
    name: collection.name || 'Untitled Collection',
    description: collection.description || undefined,
    color: collection.color || undefined,
    icon: collection.icon || undefined,
    createdAt: collection.createdAt ? new Date(collection.createdAt) : new Date(),
    updatedAt: collection.updatedAt ? new Date(collection.updatedAt) : new Date(),
    noteIds: Array.isArray(collection.noteIds) ? collection.noteIds.filter((id: any) => typeof id === 'string') : [],
    isDefault: Boolean(collection.isDefault),
    sortOrder: typeof collection.sortOrder === 'number' ? collection.sortOrder : 0
  };
};

// Load collections from file system with enhanced error handling
const loadCollectionsFromFile = async (): Promise<Collection[]> => {
  const settings = getSettings();
  if (!settings.saveLocation) {
    console.log('No save location configured, using default collections');
    return [...DEFAULT_COLLECTIONS];
  }

  try {
    const collectionsData = await window.fileOps.readCollectionsFile(settings.saveLocation);
    if (!collectionsData) {
      console.log('No collections file found, using default collections');
      return [...DEFAULT_COLLECTIONS];
    }

    // Parse JSON with error handling for corrupted data
    let parsedData;
    try {
      parsedData = JSON.parse(collectionsData);
    } catch (parseError) {
      console.error('Collections file contains invalid JSON, attempting recovery:', parseError);
      
      // Try to create a backup of the corrupted file
      try {
        const backupData = `${collectionsData}\n\n// Corrupted on ${new Date().toISOString()}`;
        await window.fileOps.saveCollectionsFile(backupData, settings.saveLocation + '_backup_' + Date.now());
        console.log('Created backup of corrupted collections file');
      } catch (backupError) {
        console.error('Failed to create backup of corrupted collections file:', backupError);
      }
      
      // Return default collections for corrupted data
      return [...DEFAULT_COLLECTIONS];
    }

    if (!Array.isArray(parsedData)) {
      console.warn('Collections data is not an array, using default collections');
      return [...DEFAULT_COLLECTIONS];
    }

    // Validate and sanitize each collection with detailed error reporting
    const loadedCollections: Collection[] = [];
    let corruptedCount = 0;

    for (const item of parsedData) {
      try {
        const sanitized = sanitizeCollection(item);
        if (validateCollectionData(sanitized)) {
          loadedCollections.push(sanitized);
        } else {
          console.warn('Collection failed validation after sanitization:', item);
          corruptedCount++;
        }
      } catch (sanitizeError) {
        console.error('Error sanitizing collection:', item, sanitizeError);
        corruptedCount++;
      }
    }

    if (corruptedCount > 0) {
      console.warn(`Found ${corruptedCount} corrupted collections that were skipped`);
    }

    // Ensure default collection exists
    const hasDefaultCollection = loadedCollections.some(c => c.isDefault);
    if (!hasDefaultCollection) {
      loadedCollections.unshift(...DEFAULT_COLLECTIONS);
    }

    console.log(`Loaded ${loadedCollections.length} collections from file (${corruptedCount} corrupted entries skipped)`);
    return loadedCollections;
  } catch (error) {
    console.error('Error loading collections from file:', error);
    
    // Check if it's a file system error vs other errors
    if (error instanceof Error) {
      if (error.message.includes('ENOENT') || error.message.includes('not found')) {
        console.log('Collections file does not exist, using default collections');
      } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
        console.error('Permission denied accessing collections file, using default collections');
      } else {
        console.error('Unexpected error loading collections, using default collections');
      }
    }
    
    return [...DEFAULT_COLLECTIONS];
  }
};

// Save collections to file system with enhanced error handling
const saveCollectionsToFile = async (collections: Collection[]): Promise<void> => {
  const settings = getSettings();
  if (!settings.saveLocation) {
    console.log('No save location configured, skipping collections save');
    return;
  }

  try {
    // Filter out default collections from saved data (they're always added on load)
    const collectionsToSave = collections.filter(c => !c.isDefault);
    
    // Validate collections before saving
    const validCollections = collectionsToSave.filter(collection => {
      if (!validateCollectionData(collection)) {
        console.warn('Skipping invalid collection during save:', collection);
        return false;
      }
      return true;
    });

    const collectionsData = JSON.stringify(validCollections, null, 2);

    // Attempt to save with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await window.fileOps.saveCollectionsFile(collectionsData, settings.saveLocation);
        console.log(`Saved ${validCollections.length} collections to file`);
        return; // Success, exit retry loop
      } catch (saveError) {
        retryCount++;
        console.error(`Error saving collections (attempt ${retryCount}/${maxRetries}):`, saveError);
        
        if (retryCount >= maxRetries) {
          throw saveError; // Re-throw after max retries
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  } catch (error) {
    console.error('Error saving collections to file:', error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('ENOSPC')) {
        console.error('Insufficient disk space to save collections');
      } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
        console.error('Permission denied saving collections file');
      } else if (error.message.includes('ENOENT')) {
        console.error('Save location directory does not exist');
      }
    }
    
    throw error;
  }
};

// Error types for better error handling
export enum CollectionErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  CORRUPTION_ERROR = 'CORRUPTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class CollectionError extends Error {
  public readonly type: CollectionErrorType;
  public readonly userMessage: string;
  public readonly originalError?: Error;

  constructor(
    type: CollectionErrorType,
    message: string,
    userMessage: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'CollectionError';
    this.type = type;
    this.userMessage = userMessage;
    this.originalError = originalError;
  }
}

// Helper function to create user-friendly error messages
const createCollectionError = (error: unknown, context: string): CollectionError => {
  if (error instanceof CollectionError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Determine error type and user message based on error content
  if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
    return new CollectionError(
      CollectionErrorType.NOT_FOUND_ERROR,
      `File not found in ${context}: ${errorMessage}`,
      'Collections file not found. Your collections will be recreated.',
      error instanceof Error ? error : undefined
    );
  }
  
  if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
    return new CollectionError(
      CollectionErrorType.PERMISSION_ERROR,
      `Permission denied in ${context}: ${errorMessage}`,
      'Permission denied. Please check file permissions or try running as administrator.',
      error instanceof Error ? error : undefined
    );
  }
  
  if (errorMessage.includes('ENOSPC')) {
    return new CollectionError(
      CollectionErrorType.NETWORK_ERROR,
      `Insufficient disk space in ${context}: ${errorMessage}`,
      'Insufficient disk space. Please free up some space and try again.',
      error instanceof Error ? error : undefined
    );
  }
  
  if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
    return new CollectionError(
      CollectionErrorType.CORRUPTION_ERROR,
      `Data corruption in ${context}: ${errorMessage}`,
      'Collections data is corrupted. A backup will be created and collections will be reset.',
      error instanceof Error ? error : undefined
    );
  }
  
  return new CollectionError(
    CollectionErrorType.UNKNOWN_ERROR,
    `Unknown error in ${context}: ${errorMessage}`,
    'An unexpected error occurred. Please try again or restart the application.',
    error instanceof Error ? error : undefined
  );
};

// Collection service functions
export const collectionService = {
  // Get all collections with error handling
  async getAllCollections(): Promise<Collection[]> {
    try {
      if (!collectionsCache) {
        collectionsCache = await loadCollectionsFromFile();
      }
      return [...collectionsCache].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } catch (error) {
      const collectionError = createCollectionError(error, 'getAllCollections');
      console.error('CollectionService - Error getting all collections:', collectionError);
      throw collectionError;
    }
  },

  // Get collections with note counts
  async getCollectionsWithCounts(notes: Note[]): Promise<CollectionWithNoteCount[]> {
    const allCollections = await this.getAllCollections();

    return allCollections.map(collection => {
      let noteCount = 0;

      if (collection.isDefault) {
        // "All" collection shows all notes
        noteCount = notes.length;
      } else {
        // Count notes that belong to this collection
        noteCount = notes.filter(note => collection.noteIds.includes(note.id)).length;
      }

      return {
        ...collection,
        noteCount
      };
    });
  },

  // Get a specific collection by ID
  async getCollectionById(id: string): Promise<Collection | null> {
    const allCollections = await this.getAllCollections();
    return allCollections.find(c => c.id === id) || null;
  },

  // Create a new collection
  async createCollection(input: CollectionCreateInput): Promise<Collection> {
    try {
      if (!collectionsCache) {
        collectionsCache = await loadCollectionsFromFile();
      }

      const newCollection: Collection = {
        id: uuidv4(),
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        noteIds: [],
        sortOrder: collectionsCache.length
      };

      collectionsCache.push(newCollection);
      await saveCollectionsToFile(collectionsCache);
      return newCollection;
    } catch (error) {
      const collectionError = createCollectionError(error, 'createCollection');
      console.error('CollectionService - Error creating collection:', collectionError);
      throw collectionError;
    }
  },

  // Update an existing collection
  async updateCollection(id: string, updates: CollectionUpdateInput): Promise<Collection | null> {
    if (!collectionsCache) {
      collectionsCache = await loadCollectionsFromFile();
    }

    const index = collectionsCache.findIndex(c => c.id === id);
    if (index === -1) return null;

    // Prevent updating default collections
    if (collectionsCache[index].isDefault) return null;

    collectionsCache[index] = {
      ...collectionsCache[index],
      ...updates,
      updatedAt: new Date()
    };

    await saveCollectionsToFile(collectionsCache);
    return collectionsCache[index];
  },

  // Delete a collection
  async deleteCollection(id: string): Promise<boolean> {
    if (!collectionsCache) {
      collectionsCache = await loadCollectionsFromFile();
    }

    // Prevent deletion of default collection
    const collection = collectionsCache.find(c => c.id === id);
    if (!collection || collection.isDefault) return false;

    collectionsCache = collectionsCache.filter(c => c.id !== id);
    await saveCollectionsToFile(collectionsCache);
    return true;
  },

  // Add a note to a collection
  async addNoteToCollection(collectionId: string, noteId: string): Promise<boolean> {
    if (!collectionsCache) {
      collectionsCache = await loadCollectionsFromFile();
    }

    const collection = collectionsCache.find(c => c.id === collectionId);
    if (!collection || collection.isDefault) return false;

    if (!collection.noteIds.includes(noteId)) {
      collection.noteIds.push(noteId);
      collection.updatedAt = new Date();
      await saveCollectionsToFile(collectionsCache);
    }
    return true;
  },

  // Remove a note from a collection
  async removeNoteFromCollection(collectionId: string, noteId: string): Promise<boolean> {
    if (!collectionsCache) {
      collectionsCache = await loadCollectionsFromFile();
    }

    const collection = collectionsCache.find(c => c.id === collectionId);
    if (!collection || collection.isDefault) return false;

    const index = collection.noteIds.indexOf(noteId);
    if (index > -1) {
      collection.noteIds.splice(index, 1);
      collection.updatedAt = new Date();
      await saveCollectionsToFile(collectionsCache);
    }
    return true;
  },

  // Get notes for a specific collection
  async getNotesForCollection(collectionId: string, allNotes: Note[]): Promise<Note[]> {
    const collection = await this.getCollectionById(collectionId);
    if (!collection) return [];

    if (collection.isDefault) {
      // "All" collection returns all notes
      return allNotes;
    }

    // Filter notes that belong to this collection
    return allNotes.filter(note => collection.noteIds.includes(note.id));
  },

  // Get collections that contain a specific note
  async getCollectionsForNote(noteId: string): Promise<Collection[]> {
    const allCollections = await this.getAllCollections();
    return allCollections.filter(collection =>
      !collection.isDefault && collection.noteIds.includes(noteId)
    );
  },

  // Reorder collections
  async reorderCollections(collectionIds: string[]): Promise<void> {
    if (!collectionsCache) {
      collectionsCache = await loadCollectionsFromFile();
    }

    collectionIds.forEach((id, index) => {
      const collection = collectionsCache!.find(c => c.id === id);
      if (collection && !collection.isDefault) {
        collection.sortOrder = index;
        collection.updatedAt = new Date();
      }
    });
    await saveCollectionsToFile(collectionsCache);
  },

  // Force reload collections from storage
  async reloadCollections(): Promise<void> {
    collectionsCache = null;
    await this.getAllCollections();
  },

  // Clear collections cache (useful for testing)
  clearCache(): void {
    collectionsCache = null;
  },

  // Initialize collections (migration and setup)
  async initializeCollections(): Promise<void> {
    try {
      // Load collections to initialize cache
      await this.getAllCollections();
      console.log('Collections initialized successfully');
    } catch (error) {
      console.error('Error initializing collections:', error);
      // Fallback to default collections
      collectionsCache = [...DEFAULT_COLLECTIONS];
    }
  },

  // Subscribe to collection updates
  subscribeToUpdates(listener: CollectionUpdateListener): () => void {
    collectionUpdateListeners.add(listener);
    return () => {
      collectionUpdateListeners.delete(listener);
    };
  },

  // Notify all listeners of collection updates with debouncing
  notifyCollectionUpdates(notes: Note[], immediate: boolean = false): void {
    // Clear existing debounce timer
    if (updateDebounceTimer) {
      clearTimeout(updateDebounceTimer);
      updateDebounceTimer = null;
    }

    const notifyListeners = async () => {
      try {
        // Only notify if there are listeners
        if (collectionUpdateListeners.size === 0) {
          console.log('CollectionService - No listeners to notify, skipping update');
          return;
        }

        console.log('CollectionService - Notifying', collectionUpdateListeners.size, 'listeners of collection updates');
        const collectionsWithCounts = await this.getCollectionsWithCounts(notes);
        
        collectionUpdateListeners.forEach(listener => {
          try {
            listener(collectionsWithCounts);
          } catch (error) {
            console.error('Error in collection update listener:', error);
          }
        });
      } catch (error) {
        console.error('Error getting collections with counts for notification:', error);
      }
    };

    if (immediate) {
      // Execute immediately for critical updates (deletions, creations)
      console.log('CollectionService - Immediate notification requested');
      notifyListeners();
    } else {
      // Debounce for frequent updates (500ms delay to reduce flicker)
      console.log('CollectionService - Debounced notification scheduled');
      updateDebounceTimer = setTimeout(notifyListeners, 500);
    }
  },

  // Handle note creation - update collection counts
  async handleNoteCreated(noteId: string, notes: Note[]): Promise<void> {
    console.log('CollectionService - Handling note created:', noteId);
    
    // Notify listeners with updated counts
    this.notifyCollectionUpdates(notes, false); // Use debouncing for creation
  },

  // Handle note deletion - update collection counts and remove from collections
  async handleNoteDeleted(noteId: string, notes: Note[]): Promise<void> {
    console.log('CollectionService - Handling note deleted:', noteId);
    
    if (!collectionsCache) {
      collectionsCache = await loadCollectionsFromFile();
    }

    // Remove the note from all collections that contain it
    let collectionsModified = false;
    for (const collection of collectionsCache) {
      if (!collection.isDefault && collection.noteIds.includes(noteId)) {
        const index = collection.noteIds.indexOf(noteId);
        if (index > -1) {
          collection.noteIds.splice(index, 1);
          collection.updatedAt = new Date();
          collectionsModified = true;
          console.log(`CollectionService - Removed note ${noteId} from collection ${collection.name}`);
        }
      }
    }

    // Save collections if any were modified
    if (collectionsModified) {
      try {
        await saveCollectionsToFile(collectionsCache);
        console.log('CollectionService - Saved collections after note deletion');
      } catch (error) {
        console.error('CollectionService - Error saving collections after note deletion:', error);
      }
    }

    // Notify listeners immediately for deletions (more critical)
    this.notifyCollectionUpdates(notes, true);
  },

  // Handle note added to collection - update counts
  async handleNoteAddedToCollection(collectionId: string, noteId: string, notes: Note[]): Promise<void> {
    console.log('CollectionService - Handling note added to collection:', { collectionId, noteId });
    
    // Add the note to the collection (this already exists in addNoteToCollection)
    const success = await this.addNoteToCollection(collectionId, noteId);
    
    if (success) {
      // Notify listeners with updated counts
      this.notifyCollectionUpdates(notes, false); // Use debouncing
    }
  },

  // Handle note removed from collection - update counts
  async handleNoteRemovedFromCollection(collectionId: string, noteId: string, notes: Note[]): Promise<void> {
    console.log('CollectionService - Handling note removed from collection:', { collectionId, noteId });
    
    // Remove the note from the collection (this already exists in removeNoteFromCollection)
    const success = await this.removeNoteFromCollection(collectionId, noteId);
    
    if (success) {
      // Notify listeners with updated counts
      this.notifyCollectionUpdates(notes, false); // Use debouncing
    }
  },

  // Refresh collection counts for all collections
  async refreshCollectionCounts(notes: Note[]): Promise<CollectionWithNoteCount[]> {
    console.log('CollectionService - Refreshing collection counts for', notes.length, 'notes');
    
    const collectionsWithCounts = await this.getCollectionsWithCounts(notes);
    
    // Notify listeners immediately for manual refresh
    this.notifyCollectionUpdates(notes, true);
    
    return collectionsWithCounts;
  },

  // Cleanup method to clear debounce timers
  cleanup(): void {
    if (updateDebounceTimer) {
      clearTimeout(updateDebounceTimer);
      updateDebounceTimer = null;
    }
    collectionUpdateListeners.clear();
  },

  // Session restoration - validate and restore active collection
  async validateActiveCollection(activeCollectionId: string): Promise<string> {
    try {
      const allCollections = await this.getAllCollections();
      
      // Check if the active collection still exists
      const activeCollection = allCollections.find(c => c.id === activeCollectionId);
      
      if (activeCollection) {
        console.log(`Active collection '${activeCollection.name}' validated successfully`);
        return activeCollectionId;
      } else {
        console.warn(`Active collection '${activeCollectionId}' no longer exists, falling back to 'all'`);
        return 'all'; // Fallback to default collection
      }
    } catch (error) {
      console.error('Error validating active collection:', error);
      return 'all'; // Fallback to default collection on error
    }
  },

  // Session restoration - get restored active collection with validation
  async getRestoredActiveCollection(): Promise<string> {
    try {
      // Import settings service functions
      const { getActiveCollectionId } = await import('./settingsService');
      const savedActiveCollectionId = getActiveCollectionId();
      
      console.log(`Restoring active collection: ${savedActiveCollectionId}`);
      
      // Validate that the saved collection still exists
      return await this.validateActiveCollection(savedActiveCollectionId);
    } catch (error) {
      console.error('Error restoring active collection:', error);
      return 'all'; // Fallback to default collection
    }
  },

  // Session persistence - save active collection state
  async saveActiveCollectionState(activeCollectionId: string): Promise<void> {
    try {
      // Import settings service functions
      const { saveActiveCollectionId } = await import('./settingsService');
      saveActiveCollectionId(activeCollectionId);
      console.log(`Active collection state saved: ${activeCollectionId}`);
    } catch (error) {
      console.error('Error saving active collection state:', error);
      // Don't throw error - this is not critical for app functionality
    }
  },

  // Enhanced initialization with session restoration
  async initializeCollectionsWithSession(): Promise<{ collections: Collection[], activeCollectionId: string }> {
    try {
      console.log('Initializing collections with session restoration...');
      
      // Initialize collections first
      await this.initializeCollections();
      
      // Get all collections
      const collections = await this.getAllCollections();
      
      // Restore active collection state
      const activeCollectionId = await this.getRestoredActiveCollection();
      
      console.log(`Collections initialized with ${collections.length} collections, active: ${activeCollectionId}`);
      
      return {
        collections,
        activeCollectionId
      };
    } catch (error) {
      console.error('Error initializing collections with session:', error);
      
      // Fallback to basic initialization
      await this.initializeCollections();
      const collections = await this.getAllCollections();
      
      return {
        collections,
        activeCollectionId: 'all'
      };
    }
  },

  // Health check for collection data integrity
  async performHealthCheck(): Promise<{ healthy: boolean, issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check if collections can be loaded
      const collections = await this.getAllCollections();
      
      if (collections.length === 0) {
        issues.push('No collections found');
      }
      
      // Check if default collection exists
      const hasDefault = collections.some(c => c.isDefault);
      if (!hasDefault) {
        issues.push('Default collection missing');
      }
      
      // Check for duplicate IDs
      const ids = collections.map(c => c.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        issues.push('Duplicate collection IDs found');
      }
      
      // Check for invalid data
      for (const collection of collections) {
        if (!validateCollectionData(collection)) {
          issues.push(`Invalid collection data: ${(collection as any)?.id || 'unknown'}`);
        }
      }
      
      console.log(`Collection health check completed: ${issues.length === 0 ? 'healthy' : 'issues found'}`);
      
      return {
        healthy: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error during collection health check:', error);
      issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        healthy: false,
        issues
      };
    }
  }
};

// Collection icon components as SVG strings
export const COLLECTION_ICONS = {
  'notes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
  'work': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  'personal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
  'ideas': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>',
  'learning': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  'goals': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>',
  'projects': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  'favorites': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>',
  'archive': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
  'tasks': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  'calendar': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  'shopping': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
} as const;

// Default collection icons and colors
export const COLLECTION_PRESETS = [
  { icon: 'notes', color: '#3b82f6', name: 'Notes' },
  { icon: 'work', color: '#059669', name: 'Work' },
  { icon: 'personal', color: '#dc2626', name: 'Personal' },
  { icon: 'ideas', color: '#d97706', name: 'Ideas' },
  { icon: 'learning', color: '#7c3aed', name: 'Learning' },
  { icon: 'goals', color: '#be185d', name: 'Goals' },
  { icon: 'projects', color: '#374151', name: 'Projects' },
  { icon: 'favorites', color: '#ef4444', name: 'Favorites' },
  { icon: 'archive', color: '#6b7280', name: 'Archive' },
  { icon: 'tasks', color: '#10b981', name: 'Tasks' },
  { icon: 'calendar', color: '#8b5cf6', name: 'Calendar' },
  { icon: 'shopping', color: '#f59e0b', name: 'Shopping' }
] as const;