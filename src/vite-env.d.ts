/// <reference types="vite/client" />

// Window interface extensions for Electron IPC
interface Window {
  // Note settings window specific properties
  IS_NOTE_SETTINGS_WINDOW?: boolean;
  NOTE_ID?: string;
  ipcRenderer: {
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    off: (channel: string, ...args: any[]) => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };

  electronAPI: {
    platform: () => Promise<string>;
  };
  
  windowControls: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    moveWindow: (moveX: number, moveY: number) => Promise<void>;
    togglePin: (shouldPin: boolean) => Promise<void>;
    isWindowPinned: () => Promise<boolean>;
    setPinState: (noteId: string, isPinned: boolean) => Promise<void>;
    setTransparency: (value: number) => Promise<void>;
    getTransparency: () => Promise<number>;
  };
  
  noteWindow: {
    openNote: (noteId: string, initialNoteData?: any) => Promise<any>;
    createNote: (saveLocation?: string) => Promise<any>;
    createNoteWithId: (noteId: string) => Promise<any>;
    getNoteId: () => Promise<string>;
    getTransientNewNoteData: (noteId: string) => Promise<any>;
    noteUpdated: (noteId: string, updatedProperties?: Record<string, any>) => void;
    onInitialNoteData: (callback: (note: any) => void) => () => void;
    onNoteUpdated: (callback: (noteId: string, updatedProperties?: Record<string, any>) => void) => () => void;
  };
  
  settings: {
    openSettings: () => Promise<any>;
    openNoteSettings: (noteId: string) => Promise<any>;
    closeNoteSettings: (noteId: string) => Promise<any>;
    isSettingsWindow: () => Promise<boolean>;
    isNoteSettingsWindow: () => Promise<boolean>;
    selectDirectory: () => Promise<any>;
    getDefaultSaveLocation: () => Promise<string>;
    setAutoLaunch: (enabled: boolean) => Promise<any>;
    getAutoLaunch: () => Promise<boolean>;
    settingsUpdated: () => void;
    themeChanged: (theme: string) => void;
    syncSettings: (settings: Record<string, unknown>) => Promise<any>;
    getMainProcessSettings: () => Promise<any>;
    onSettingsUpdateAcknowledged: (callback: (acknowledged: boolean) => void) => () => void;
  };
  
  fileOps: {
    saveNoteToFile: (noteTitle: string, content: string, saveLocation: string, oldTitle?: string) => Promise<{success: boolean, error?: string}>;
    deleteNoteFile: (noteTitle: string, saveLocation: string) => Promise<{success: boolean, error?: string}>;
    listNoteFiles: (directoryPath: string) => Promise<Array<{title: string, name: string, path: string, createdAt: string, modifiedAt: string, metadata: any}>>;
    readNoteFile: (filePath: string) => Promise<string>;
    saveCollectionsFile: (collectionsData: string, saveLocation: string) => Promise<{success: boolean, error?: string}>;
    readCollectionsFile: (saveLocation: string) => Promise<{success: boolean, data?: string, error?: string}>;
  };
}
