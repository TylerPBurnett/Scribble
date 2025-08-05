import { Note } from '../types/Note';
import { updateNote } from './noteService';

export interface AutosaveConfig {
  enabled: boolean;
  strategies: {
    debounce: {
      enabled: boolean;
      delay: number; // milliseconds
    };
    periodic: {
      enabled: boolean;
      interval: number; // milliseconds
    };
    characterThreshold: {
      enabled: boolean;
      threshold: number; // characters changed
    };
  };
  saveOnFocusLoss: boolean;
  saveOnWindowClose: boolean;
  conflictResolution: 'user' | 'timestamp' | 'merge';
}

export class SmartAutosaveService {
  private config: AutosaveConfig;
  private debounceTimer: NodeJS.Timeout | null = null;
  private periodicTimer: NodeJS.Timeout | null = null;
  private characterCount = 0;
  private lastSavedContent = '';
  private isSaving = false;
  private saveQueue: (() => Promise<void>)[] = [];

  constructor(config: AutosaveConfig) {
    this.config = config;
  }

  /**
   * Initialize autosave for a note - similar to Obsidian's file watchers
   */
  initializeAutosave(
    note: Note,
    getCurrentContent: () => string,
    onSave: (savedNote: Note) => void,
    onConflict?: (localNote: Note, remoteNote: Note) => Note
  ) {
    this.lastSavedContent = getCurrentContent();

    // Setup periodic saves (like Obsidian's background saves)
    if (this.config.strategies.periodic.enabled) {
      this.setupPeriodicSave(note, getCurrentContent, onSave);
    }

    // Setup focus loss saves
    if (this.config.saveOnFocusLoss) {
      this.setupFocusLossSave(note, getCurrentContent, onSave);
    }

    // Setup window close saves
    if (this.config.saveOnWindowClose) {
      this.setupWindowCloseSave(note, getCurrentContent, onSave);
    }
  }

  /**
   * Trigger autosave with intelligent strategy selection
   */
  async triggerAutosave(
    note: Note,
    currentContent: string,
    onSave: (savedNote: Note) => void,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) {
    if (!this.config.enabled || this.isSaving) return;

    const contentChanged = currentContent !== this.lastSavedContent;
    if (!contentChanged) return;

    const characterDelta = Math.abs(currentContent.length - this.lastSavedContent.length);
    
    // Determine save strategy based on priority and content changes
    if (priority === 'high') {
      await this.saveImmediately(note, currentContent, onSave);
    } else if (this.config.strategies.characterThreshold.enabled && 
               characterDelta >= this.config.strategies.characterThreshold.threshold) {
      await this.saveImmediately(note, currentContent, onSave);
    } else if (this.config.strategies.debounce.enabled) {
      this.scheduleDebounvedSave(note, currentContent, onSave);
    }
  }

  /**
   * Smart debounced save with adaptive timing
   */
  private scheduleDebounvedSave(
    note: Note,
    content: string,
    onSave: (savedNote: Note) => void
  ) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Adaptive delay based on content size (larger documents get longer delays)
    const baseDelay = this.config.strategies.debounce.delay;
    const contentSize = content.length;
    const adaptiveDelay = Math.min(baseDelay + (contentSize / 1000), baseDelay * 3);

    this.debounceTimer = setTimeout(async () => {
      await this.saveImmediately(note, content, onSave);
    }, adaptiveDelay);
  }

  /**
   * Immediate save with queue management
   */
  private async saveImmediately(
    note: Note,
    content: string,
    onSave: (savedNote: Note) => void
  ) {
    // Add to queue to prevent concurrent saves
    return new Promise<void>((resolve) => {
      this.saveQueue.push(async () => {
        try {
          this.isSaving = true;
          
          const updatedNote = {
            ...note,
            content,
            updatedAt: new Date()
          };

          const savedNote = await updateNote(updatedNote);
          this.lastSavedContent = content;
          onSave(savedNote);
          
          console.log('Smart autosave completed:', {
            noteId: savedNote.id,
            contentLength: content.length,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Smart autosave failed:', error);
          // Could implement retry logic here
        } finally {
          this.isSaving = false;
          resolve();
        }
      });

      // Process queue if not already processing
      if (this.saveQueue.length === 1) {
        this.processQueue();
      }
    });
  }

  /**
   * Process save queue sequentially
   */
  private async processQueue() {
    while (this.saveQueue.length > 0) {
      const saveOperation = this.saveQueue.shift();
      if (saveOperation) {
        await saveOperation();
      }
    }
  }

  /**
   * Setup periodic background saves (like Obsidian's vault sync)
   */
  private setupPeriodicSave(
    note: Note,
    getCurrentContent: () => string,
    onSave: (savedNote: Note) => void
  ) {
    this.periodicTimer = setInterval(async () => {
      const currentContent = getCurrentContent();
      if (currentContent !== this.lastSavedContent) {
        await this.triggerAutosave(note, currentContent, onSave, 'low');
      }
    }, this.config.strategies.periodic.interval);
  }

  /**
   * Setup focus loss saves
   */
  private setupFocusLossSave(
    note: Note,
    getCurrentContent: () => string,
    onSave: (savedNote: Note) => void
  ) {
    const handleFocusLoss = async () => {
      const currentContent = getCurrentContent();
      await this.triggerAutosave(note, currentContent, onSave, 'high');
    };

    window.addEventListener('blur', handleFocusLoss);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleFocusLoss();
      }
    });
  }

  /**
   * Setup window/app close saves
   */
  private setupWindowCloseSave(
    note: Note,
    getCurrentContent: () => string,
    onSave: (savedNote: Note) => void
  ) {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      const currentContent = getCurrentContent();
      if (currentContent !== this.lastSavedContent) {
        // Force immediate save on close
        await this.saveImmediately(note, currentContent, onSave);
        e.preventDefault();
        return 'You have unsaved changes. Are you sure you want to close?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  /**
   * Get save status for UI indicators
   */
  getSaveStatus(): {
    isSaving: boolean;
    lastSaved: Date | null;
    hasUnsavedChanges: boolean;
    queueLength: number;
  } {
    return {
      isSaving: this.isSaving,
      lastSaved: null, // Could track this
      hasUnsavedChanges: false, // Could implement
      queueLength: this.saveQueue.length
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
    }
    this.saveQueue = [];
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<AutosaveConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart periodic timer if changed
    if (newConfig.strategies?.periodic) {
      if (this.periodicTimer) {
        clearInterval(this.periodicTimer);
      }
      // Would need to re-setup with new interval
    }
  }
}

// Default configuration matching modern note-taking apps
export const DEFAULT_AUTOSAVE_CONFIG: AutosaveConfig = {
  enabled: true,
  strategies: {
    debounce: {
      enabled: true,
      delay: 2000 // 2 seconds like Obsidian
    },
    periodic: {
      enabled: true,
      interval: 30000 // 30 seconds background save
    },
    characterThreshold: {
      enabled: true,
      threshold: 50 // Save after 50 characters changed
    }
  },
  saveOnFocusLoss: true,
  saveOnWindowClose: true,
  conflictResolution: 'timestamp'
};
