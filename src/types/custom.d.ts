import 'react';

// Extend React's CSSProperties to include WebkitAppRegion
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}

// Extend Window interface
interface Window {
  // Window type flags
  IS_NOTE_WINDOW?: boolean;
  IS_SETTINGS_WINDOW?: boolean;

  // IPC renderer
  ipcRenderer: {
    on: (channel: string, listener: (...args: any[]) => void) => void;
    off: (channel: string, listener: (...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };

  // Window controls
  windowControls: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    moveWindow: (moveX: number, moveY: number) => Promise<void>;
    togglePin: (shouldPin: boolean) => Promise<boolean>;
    isPinned: () => Promise<boolean>;
    setPinState: (noteId: string, isPinned: boolean) => Promise<boolean>;
    setTransparency: (value: number) => Promise<void>;
  };

  // Note window
  noteWindow: {
    openNote: (noteId: string) => Promise<any>;
    createNote: () => Promise<any>;
    createNoteWithId: (noteId: string) => Promise<any>;
    getNoteId: () => Promise<string | null>;
    noteUpdated: (noteId: string, updatedProperties?: Record<string, any>) => void;
  };

  // Settings
  settings: {
    openSettings: () => Promise<any>;
    isSettingsWindow: () => Promise<boolean>;
    selectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    getDefaultSaveLocation: () => Promise<string>;
    setAutoLaunch: (enabled: boolean) => Promise<boolean>;
    getAutoLaunch: () => Promise<boolean>;
    settingsUpdated: () => void;
    themeChanged: (theme: string) => void;
    syncSettings: (settings: Record<string, unknown>) => Promise<boolean>;
    getMainProcessSettings: () => Promise<Record<string, unknown>>;
    onSettingsUpdateAcknowledged: (callback: (acknowledged: boolean) => void) => () => void;
  };

  // File operations
  fileOps: {
    saveNoteToFile: (noteId: string, title: string, content: string, saveLocation: string, oldTitle?: string) => Promise<any>;
    deleteNoteFile: (noteId: string, title: string, saveLocation: string) => Promise<any>;
    listNoteFiles: (directoryPath: string) => Promise<any[]>;
    readNoteFile: (filePath: string) => Promise<string>;
    // Collection file operations
    saveCollectionsFile: (collectionsData: string, saveLocation: string) => Promise<{ success: boolean; filePath: string }>;
    readCollectionsFile: (saveLocation: string) => Promise<string | null>;
  };
}
