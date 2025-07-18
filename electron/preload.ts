import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// Expose window control functions
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  moveWindow: (moveX: number, moveY: number) => ipcRenderer.invoke('window-move', moveX, moveY),
  togglePin: (shouldPin: boolean) => ipcRenderer.invoke('window-toggle-pin', shouldPin),
  isPinned: () => ipcRenderer.invoke('window-is-pinned'),
  setPinState: (noteId: string, isPinned: boolean) => ipcRenderer.invoke('window-set-pin-state', noteId, isPinned),
  setTransparency: (value: number) => ipcRenderer.invoke('window-set-transparency', value),
})

// Expose specific APIs for note management
contextBridge.exposeInMainWorld('noteWindow', {
  openNote: (noteId: string, initialNoteData?: any) =>
    ipcRenderer.invoke('open-note', noteId, initialNoteData),
  createNote: () => ipcRenderer.invoke('create-note'),
  createNoteWithId: (noteId: string) => ipcRenderer.invoke('create-note-with-id', noteId),
  getNoteId: () => ipcRenderer.invoke('get-note-id'),
  getTransientNewNoteData: (noteId: string) =>
    ipcRenderer.invoke('get-transient-new-note-data', noteId),
  noteUpdated: (noteId: string, updatedProperties?: Record<string, any>) =>
    ipcRenderer.send('note-updated', noteId, updatedProperties),
  onInitialNoteData: (callback: (note: any) => void) => {
    const wrappedCallback = (_: any, note: any) => callback(note);
    ipcRenderer.on('initial-note-data', wrappedCallback);
    return () => ipcRenderer.removeListener('initial-note-data', wrappedCallback);
  },
  // Add listener for note updates from other windows
  onNoteUpdated: (callback: (noteId: string, updatedProperties?: Record<string, any>) => void) => {
    const wrappedCallback = (_: any, noteId: string, updatedProperties?: Record<string, any>) =>
      callback(noteId, updatedProperties);
    ipcRenderer.on('note-updated', wrappedCallback);
    // Return a cleanup function
    return () => ipcRenderer.removeListener('note-updated', wrappedCallback);
  },
})

// Expose specific APIs for settings management
contextBridge.exposeInMainWorld('settings', {
  openSettings: () => ipcRenderer.invoke('open-settings'),
  isSettingsWindow: () => ipcRenderer.invoke('is-settings-window'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getDefaultSaveLocation: () => ipcRenderer.invoke('get-default-save-location'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  settingsUpdated: () => ipcRenderer.send('settings-updated'),
  themeChanged: (theme: string) => ipcRenderer.send('theme-changed', theme),
  syncSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('sync-settings', settings),
  getMainProcessSettings: () => ipcRenderer.invoke('get-main-process-settings'),
  onSettingsUpdateAcknowledged: (callback: (acknowledged: boolean) => void) => {
    const wrappedCallback = (_: any, acknowledged: boolean) => callback(acknowledged);
    ipcRenderer.on('settings-update-acknowledged', wrappedCallback);
    return () => ipcRenderer.removeListener('settings-update-acknowledged', wrappedCallback);
  },
})

// Expose file operation APIs
contextBridge.exposeInMainWorld('fileOps', {
  saveNoteToFile: (noteId: string, title: string, content: string, saveLocation: string, isFirstSave: boolean) =>
    ipcRenderer.invoke('save-note-to-file', noteId, title, content, saveLocation, isFirstSave),
  deleteNoteFile: (noteId: string, saveLocation: string) =>
    ipcRenderer.invoke('delete-note-file', noteId, saveLocation),
  listNoteFiles: (directoryPath: string) =>
    ipcRenderer.invoke('list-note-files', directoryPath),
  readNoteFile: (filePath: string) =>
    ipcRenderer.invoke('read-note-file', filePath),
  // Collection file operations
  saveCollectionsFile: (collectionsData: string, saveLocation: string) =>
    ipcRenderer.invoke('save-collections-file', collectionsData, saveLocation),
  readCollectionsFile: (saveLocation: string) =>
    ipcRenderer.invoke('read-collections-file', saveLocation),
})


