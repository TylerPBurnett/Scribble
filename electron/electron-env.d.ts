/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  noteWindow: {
    openNote: (noteId: string, initialNoteData?: Note) => Promise<Note>
    createNote: () => Promise<Note>
    createNoteWithId: (noteId: string) => Promise<Note>
    getNoteId: () => Promise<string | null>
    getTransientNewNoteData: (noteId: string) => Promise<Note>
    noteUpdated: (noteId: string, updatedProperties?: Partial<Note>) => void
    onInitialNoteData: (callback: (note: Note) => void) => () => void
    onNoteUpdated: (callback: (noteId: string, updatedProperties?: Partial<Note>) => void) => () => void
  }
  settings: {
    openSettings: () => Promise<void>
    isSettingsWindow: () => Promise<boolean>
    selectDirectory: () => Promise<{ canceled: boolean, filePaths: string[] }>
    getDefaultSaveLocation: () => Promise<string>
    setAutoLaunch: (enabled: boolean) => Promise<boolean>
    getAutoLaunch: () => Promise<boolean>
    settingsUpdated: () => void
    themeChanged: (theme: string) => void
    syncSettings: (settings: Record<string, unknown>) => Promise<boolean>
    getMainProcessSettings: () => Promise<Record<string, unknown>>
  }
  fileOps: {
    saveNoteToFile: (noteId: string, title: string, content: string, saveLocation: string, oldTitle?: string) => Promise<{ success: boolean, filePath?: string, error?: string }>
    deleteNoteFile: (noteId: string, title: string, saveLocation: string) => Promise<{ success: boolean, error?: string }>
    listNoteFiles: (directoryPath: string) => Promise<Array<{ name: string, path: string, id: string, createdAt: Date, modifiedAt: Date }>>
    readNoteFile: (filePath: string) => Promise<string>
    // Collection file operations
    saveCollectionsFile: (collectionsData: string, saveLocation: string) => Promise<{ success: boolean; filePath: string }>
    readCollectionsFile: (saveLocation: string) => Promise<string | null>
  }
  windowControls: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    moveWindow: (moveX: number, moveY: number) => Promise<void>
    togglePin: (shouldPin: boolean) => Promise<boolean>
    isPinned: () => Promise<boolean>
    setPinState: (noteId: string, isPinned: boolean) => Promise<boolean>
    setTransparency: (value: number) => Promise<void>
  }

}
