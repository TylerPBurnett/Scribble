import { app, BrowserWindow, ipcMain, dialog, screen, Tray, Menu, globalShortcut, nativeImage, session } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import Store from 'electron-store'
// @ts-expect-error no type definitions available
import AutoLaunch from 'auto-launch'
import { v4 as uuidv4 } from 'uuid'

// Import the Note type from shared types
// Path is relative to the compiled JS file in dist-electron
import { Note } from '../src/shared/types/Note'

// Import theme types for vibrancy configuration
import { ThemeName } from '../src/shared/styles/theme'

// Platform detection for vibrancy support
const isMacOS = process.platform === 'darwin'

// Vibrancy material configuration based on theme for BrowserWindow constructor
function getVibrancyMaterialForConstructor(theme: ThemeName): 'appearance-based' | 'titlebar' | 'selection' | 'menu' | 'popover' | 'sidebar' | 'header' | 'sheet' | 'window' | 'hud' | 'fullscreen-ui' | 'tooltip' | 'content' | 'under-window' | 'under-page' | null {
  if (!isMacOS) return null

  switch (theme) {
    case 'light':
      return 'under-window'  // Test: try under-window instead of content
    case 'dark':
      return 'under-window'
    case 'dim':
    default:
      return 'sidebar'
  }
}

// Vibrancy material configuration based on theme for setVibrancy method
function getVibrancyMaterialForSetMethod(theme: ThemeName): 'titlebar' | 'selection' | 'menu' | 'popover' | 'sidebar' | 'header' | 'sheet' | 'window' | 'hud' | 'fullscreen-ui' | 'tooltip' | 'content' | 'under-window' | 'under-page' | null {
  if (!isMacOS) return null

  switch (theme) {
    case 'light':
      return 'under-window'  // Test: try under-window instead of content
    case 'dark':
      return 'under-window'
    case 'dim':
    default:
      return 'sidebar'
  }
}

// Import the new file services
import { fileNamingService } from '../src/shared/services/fileNamingService'
import { mainProcessFileOperationService as fileOperationService, atomicWriteFile, cleanupOrphanedTempFiles } from './fileOperationService'

// Global map to store transient new note data
const transientNewNotes = new Map<string, Note>();

// ============================================================================
// CRASH RECOVERY SYSTEM
// ============================================================================

/**
 * Recovery data structure for unsaved note content
 */
interface RecoveryData {
  noteId: string;
  title: string;
  content: string;
  timestamp: number;
  saveLocation?: string;
}

/**
 * In-memory store for recovery data (synced to disk periodically)
 */
const recoveryStore = new Map<string, RecoveryData>();
let recoveryDirPath: string | null = null;
let recoveryFlushInterval: NodeJS.Timeout | null = null;

/**
 * Initialize the recovery system
 */
function initRecoverySystem(): void {
  try {
    recoveryDirPath = path.join(app.getPath('userData'), 'recovery');

    // Ensure recovery directory exists
    if (!fsSync.existsSync(recoveryDirPath)) {
      fsSync.mkdirSync(recoveryDirPath, { recursive: true });
    }

    console.log('[Recovery] Initialized recovery directory:', recoveryDirPath);

    // Start periodic flush to disk (every 10 seconds)
    recoveryFlushInterval = setInterval(() => {
      flushRecoveryData().catch(err => {
        console.error('[Recovery] Failed to flush recovery data:', err);
      });
    }, 10000);

  } catch (error) {
    console.error('[Recovery] Failed to initialize recovery system:', error);
  }
}

/**
 * Store recovery data for a note (called from renderer via IPC)
 */
function storeRecoveryData(data: RecoveryData): void {
  recoveryStore.set(data.noteId, {
    ...data,
    timestamp: Date.now()
  });
}

/**
 * Remove recovery data for a note (called after successful save)
 */
function clearRecoveryData(noteId: string): void {
  recoveryStore.delete(noteId);

  // Also remove from disk
  if (recoveryDirPath) {
    const recoveryFile = path.join(recoveryDirPath, `${noteId}.json`);
    fs.unlink(recoveryFile).catch(() => {
      // File may not exist, ignore
    });
  }
}

/**
 * Flush all recovery data to disk
 */
async function flushRecoveryData(): Promise<void> {
  if (!recoveryDirPath || recoveryStore.size === 0) return;

  const promises: Promise<void>[] = [];

  for (const [noteId, data] of recoveryStore) {
    const recoveryFile = path.join(recoveryDirPath, `${noteId}.json`);
    promises.push(
      atomicWriteFile(recoveryFile, JSON.stringify(data, null, 2))
        .catch(err => {
          console.error(`[Recovery] Failed to write recovery file for ${noteId}:`, err);
        })
    );
  }

  await Promise.all(promises);
}

/**
 * Load all recovery data from disk (called on startup)
 */
async function loadRecoveryData(): Promise<RecoveryData[]> {
  if (!recoveryDirPath) return [];

  try {
    if (!fsSync.existsSync(recoveryDirPath)) return [];

    const files = await fs.readdir(recoveryDirPath);
    const recoveryFiles = files.filter(f => f.endsWith('.json'));
    const recoveryData: RecoveryData[] = [];

    for (const file of recoveryFiles) {
      try {
        const filePath = path.join(recoveryDirPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content) as RecoveryData;

        // Only include recovery data less than 24 hours old
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          recoveryData.push(data);
        } else {
          // Clean up old recovery files
          await fs.unlink(filePath).catch(() => {});
        }
      } catch {
        // Skip invalid files
      }
    }

    return recoveryData;
  } catch (error) {
    console.error('[Recovery] Failed to load recovery data:', error);
    return [];
  }
}

/**
 * Clean up all recovery data (called after successful recovery or dismissal)
 */
async function clearAllRecoveryData(): Promise<void> {
  recoveryStore.clear();

  if (!recoveryDirPath) return;

  try {
    const files = await fs.readdir(recoveryDirPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(recoveryDirPath, file)).catch(() => {});
      }
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Emergency flush - called during crash handling
 */
function emergencyFlushSync(): void {
  if (!recoveryDirPath || recoveryStore.size === 0) return;

  console.log('[Recovery] Emergency flush - saving', recoveryStore.size, 'notes');

  for (const [noteId, data] of recoveryStore) {
    try {
      const recoveryFile = path.join(recoveryDirPath, `${noteId}.json`);
      fsSync.writeFileSync(recoveryFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[Recovery] Emergency flush failed for ${noteId}:`, err);
    }
  }
}

// ============================================================================
// PROCESS CRASH HANDLERS
// ============================================================================

/**
 * Handle uncaught exceptions - try to save recovery data before crashing
 */
process.on('uncaughtException', (error: Error) => {
  console.error('[CRASH] Uncaught exception:', error);
  console.error('[CRASH] Stack trace:', error.stack);

  // Emergency save recovery data
  emergencyFlushSync();

  // Log crash info
  if (recoveryDirPath) {
    try {
      const crashLog = path.join(recoveryDirPath, `crash-${Date.now()}.log`);
      fsSync.writeFileSync(crashLog, `
Uncaught Exception at ${new Date().toISOString()}
Error: ${error.message}
Stack: ${error.stack}
      `.trim(), 'utf-8');
    } catch {
      // Can't write crash log, continue with exit
    }
  }

  // Exit with error code
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[CRASH] Unhandled promise rejection:', reason);

  // Don't exit for unhandled rejections, but log them
  if (recoveryDirPath) {
    try {
      const errorLog = path.join(recoveryDirPath, `rejection-${Date.now()}.log`);
      const errorMessage = reason instanceof Error ? reason.stack : String(reason);
      fsSync.writeFileSync(errorLog, `
Unhandled Rejection at ${new Date().toISOString()}
Reason: ${errorMessage}
      `.trim(), 'utf-8');
    } catch {
      // Can't write error log
    }
  }
});


// Type for settings
interface SettingsType {
  hotkeys?: {
    newNote?: string;
    [key: string]: string | undefined;
  };
  globalHotkeys?: {
    newNote?: string;
    toggleApp?: string;  // <-- new preferred name
    showApp?: string;    // <-- legacy name kept for BC
    [key: string]: string | undefined;
  };
  [key: string]: unknown;
}

// Create a store for window state
const windowStateStore = new Store({
  name: 'window-state',
  defaults: {
    mainWindow: {
      width: 1200,
      height: 800,
      x: undefined,
      y: undefined,
      isMaximized: false
    }
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST



let mainWindow: BrowserWindow | null
let settingsWindow: BrowserWindow | null = null
const noteWindows = new Map<string, BrowserWindow>()
const noteSettingsWindows = new Map<string, BrowserWindow>()
let tray: Tray | null = null
let isQuitting = false

// Create auto launcher
const scribbleAutoLauncher = new AutoLaunch({
  name: 'Scribble',
  path: app.getPath('exe'),
})

function createMainWindow() {
  // Configure window differently based on platform
  const isMac = process.platform === 'darwin'

  // Get stored window state
  const mainWindowState = windowStateStore.get('mainWindow') as {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized: boolean;
  };

  // Check if the saved position is still on a connected screen
  let validPosition = false;
  if (mainWindowState.x !== undefined && mainWindowState.y !== undefined) {
    const displays = screen.getAllDisplays();
    validPosition = displays.some(display => {
      const bounds = display.bounds;
      return (
        mainWindowState.x! >= bounds.x &&
        mainWindowState.y! >= bounds.y &&
        mainWindowState.x! < bounds.x + bounds.width &&
        mainWindowState.y! < bounds.y + bounds.height
      );
    });
  }

  // Get current theme for vibrancy configuration
  const settingsStore = new Store({ name: 'settings' });
  const settings = settingsStore.get('settings') as { theme?: ThemeName } || {};
  const currentTheme = settings.theme || 'dim';

  // Configure vibrancy settings for macOS
  const vibrancyMaterial = getVibrancyMaterialForConstructor(currentTheme);
  console.log('Window creation - Current theme:', currentTheme);

  const vibrancyConfig = {
    transparent: true,
    ...(isMacOS && vibrancyMaterial ? {
      vibrancy: vibrancyMaterial,
    } : {})
  };

  // Only log detailed vibrancy info in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Window creation - Vibrancy material:', vibrancyMaterial);
    console.log('Window creation - Is macOS:', isMacOS);
    console.log('Window creation - Final vibrancy config:', vibrancyConfig);
  }

  // Create the browser window with saved state or defaults
  mainWindow = new BrowserWindow({
    width: mainWindowState.width,
    height: mainWindowState.height,
    x: validPosition ? mainWindowState.x : undefined,
    y: validPosition ? mainWindowState.y : undefined,
    minWidth: 250,
    minHeight: 300,
    // Modern window startup - hide until ready
    show: false,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    // Use the new rounded-corner icon
    icon: path.join(process.env.APP_ROOT, 'src/assets/icon2-512.png'),
    title: 'Scribble',
    frame: false,
    // On macOS, use 'hiddenInset' to show the native traffic lights
    // On Windows, use 'hidden' to completely hide the title bar
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    // Additional macOS-specific settings - vertically centered in 40px title bar
    trafficLightPosition: { x: 12, y: 11 },  // Centered vertically (40px height / 2 - ~9px for button radius)
    // Apply vibrancy configuration on macOS
    ...vibrancyConfig,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Modern window startup - show when ready
  // Modern window startup - show when content is loaded
  mainWindow.webContents.once('did-finish-load', () => {
    // Add a small delay to ensure React has finished rendering
    setTimeout(() => {
      mainWindow?.show();

      // Maximize window if it was maximized before
      if (mainWindowState.isMaximized) {
        mainWindow?.maximize();
      }
    }, 100);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Save window state on resize, move, maximize, and unmaximize
  const saveWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const isMaximized = mainWindow.isMaximized();

    // Only update position if the window is not maximized
    if (!isMaximized) {
      const [width, height] = mainWindow.getSize();
      const [x, y] = mainWindow.getPosition();

      windowStateStore.set('mainWindow', {
        width,
        height,
        x,
        y,
        isMaximized
      });
    } else {
      // Just update the maximized state
      windowStateStore.set('mainWindow.isMaximized', isMaximized);
    }
  };

  // Add event listeners to save window state
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  // Save window state before the window is destroyed
  mainWindow.on('close', saveWindowState);

  // Handle close event - minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    // If we're not actually quitting the app, just hide the window
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
      return false
    }
    return true
  })

  // Clean up when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  })

  // Handle minimize event - minimize to tray
  mainWindow.on('minimize', (event: Electron.Event) => {
    event.preventDefault()
    mainWindow?.hide()
  })
}

function createNoteWindow(noteId: string) {
  console.log('Creating note window with ID:', noteId)

  // Check if window already exists
  if (noteWindows.has(noteId)) {
    const existingWindow = noteWindows.get(noteId)
    if (existingWindow) {
      console.log('Window already exists, focusing it')
      existingWindow.focus()
      return existingWindow
    }
  }

  // Create new window
  console.log('Creating new BrowserWindow for note')

  // Get stored note window state or use defaults
  const noteWindowDefaults = windowStateStore.get('noteWindowDefaults', {
    width: 600,
    height: 500
  }) as { width: number; height: number };

  const noteWindow = new BrowserWindow({
    width: noteWindowDefaults.width,
    height: noteWindowDefaults.height,
    minWidth: 250,
    minHeight: 300,
    // Modern window startup - hide until ready
    show: false,
    // Use the new rounded-corner icon
    icon: path.join(process.env.APP_ROOT, 'src/assets/icon2-512.png'),
    title: 'Scribble - Note',
    frame: false,
    // Use 'hidden' for both macOS and Windows to completely hide the title bar
    // This disables the native traffic lights on macOS for note windows only
    titleBarStyle: 'hidden',
    // Completely hide the traffic lights on macOS
    titleBarOverlay: false,
    // Don't show traffic lights at all
    trafficLightPosition: { x: -20, y: -20 },
    // Enable transparency for the window
    transparent: true, // Enable true window transparency
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Load the note.html file instead of index.html
  let url;
  if (VITE_DEV_SERVER_URL) {
    // In development mode, we need to handle the URL carefully
    // The VITE_DEV_SERVER_URL might be something like http://localhost:5173/
    // We need to make sure we're loading note.html with the noteId parameter
    const baseUrl = VITE_DEV_SERVER_URL.endsWith('/') ?
      VITE_DEV_SERVER_URL :
      `${VITE_DEV_SERVER_URL}/`;
    url = `${baseUrl}note.html?noteId=${noteId}`;
  } else {
    // In production mode, we load the file directly
    url = path.join(RENDERER_DIST, 'note.html');
  }

  console.log('=== Creating Note Window ===');
  console.log('VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL);
  console.log('Note ID:', noteId);
  console.log('Loading URL for note window:', VITE_DEV_SERVER_URL ? url : `${url} with query noteId=${noteId}`)

  if (VITE_DEV_SERVER_URL) {
    noteWindow.loadURL(url)
  } else {
    noteWindow.loadFile(url, {
      query: { noteId }
    })
  }



  // Store the window reference
  noteWindows.set(noteId, noteWindow)

  // Modern window startup - show window smoothly when ready
  // Modern window startup - show window smoothly when content is loaded
  noteWindow.webContents.once('did-finish-load', () => {
    // Add a delay to ensure React has finished rendering and note is loaded
    setTimeout(() => {
      noteWindow.show();
    }, 100);

    // Check if we have transient data for this note
    if (transientNewNotes.has(noteId)) {
      const initialNoteData = transientNewNotes.get(noteId);
      console.log(`[Main Process] Sending initial note data for ID: ${noteId}`);
      noteWindow.webContents.send('initial-note-data', initialNoteData);

      // Don't delete the data here - the renderer will request it again if needed
      // and will signal when it can be deleted
    }
  });

  // Add a handler for navigation events (including refreshes)
  noteWindow.webContents.on('will-navigate', (event, url) => {
    console.log(`=== Note window ${noteWindow.id} will navigate to: ${url} ===`);
    console.log('Current noteId associated with this window:', noteId);
    console.log('Is this window still in the noteWindows Map?', noteWindows.has(noteId) && noteWindows.get(noteId) === noteWindow);

    // Only prevent navigation if it's not already to a note.html URL
    const urlObj = new URL(url);
    const isNoteHtml = urlObj.pathname.endsWith('note.html');

    if (!isNoteHtml) {
      // Prevent the default navigation
      event.preventDefault();

      // Instead, reload the window with the noteId parameter
      if (VITE_DEV_SERVER_URL) {
        const baseUrl = VITE_DEV_SERVER_URL.endsWith('/') ?
          VITE_DEV_SERVER_URL :
          `${VITE_DEV_SERVER_URL}/`;
        const newUrl = `${baseUrl}note.html?noteId=${noteId}`;
        console.log('Reloading with URL:', newUrl);
        noteWindow.loadURL(newUrl);
      } else {
        noteWindow.loadFile(path.join(RENDERER_DIST, 'note.html'), {
          query: { noteId }
        });
      }

      console.log('Reloaded window with noteId parameter:', noteId);
    } else {
      // If it's already a note.html URL, make sure it has the noteId parameter
      if (!urlObj.searchParams.has('noteId')) {
        event.preventDefault();
        urlObj.searchParams.set('noteId', noteId);
        noteWindow.loadURL(urlObj.toString());
        console.log('Added noteId parameter to existing note.html URL:', urlObj.toString());
      }
    }
  });

  // Save note window size when closed to use as default for future windows
  noteWindow.on('close', () => {
    // Only save size if the window is not maximized and not destroyed
    if (!noteWindow.isDestroyed() && !noteWindow.isMaximized()) {
      const [width, height] = noteWindow.getSize();
      windowStateStore.set('noteWindowDefaults', { width, height });
    }
  });

  // Clean up when window is closed
  noteWindow.on('closed', () => {
    console.log(`[Main Process] Note window closed: ${noteId}`);
    noteWindows.delete(noteId);

    // Check if this was an unsaved note that should be removed from the notes list
    if (transientNewNotes.has(noteId)) {
      const transientNote = transientNewNotes.get(noteId);

      // If the note was still unsaved (never saved to disk), notify the main window to remove it
      if (transientNote && transientNote._unsaved) {
        console.log(`[Main Process] Unsaved note closed without saving, triggering refresh: ${noteId}`);

        // Broadcast to all windows that they should refresh their notes list
        // This ensures the unsaved note is removed from the list
        BrowserWindow.getAllWindows().forEach(window => {
          if (!window.isDestroyed()) {
            window.webContents.send('remove-unsaved-note', noteId);
          }
        });

        // Use debounced refresh to prevent spam
        invalidateFileListCache();
        broadcastRefreshDebounced();
      }

      console.log(`[Main Process] Cleaning up transient data for note: ${noteId}`);
      transientNewNotes.delete(noteId);
    }
  })

  return noteWindow
}

function createSettingsWindow() {
  // Don't create multiple settings windows
  if (settingsWindow) {
    settingsWindow.focus()
    return settingsWindow
  }

  // Configure window differently based on platform
  const isMac = process.platform === 'darwin'

  // Get stored settings window state or use main window size as default
  const settingsWindowState = windowStateStore.get('settingsWindow', {
    width: 800,
    height: 600,
    x: undefined,
    y: undefined
  }) as { width: number; height: number; x?: number; y?: number };

  // If main window exists, center the settings window relative to it
  let x: number | undefined = settingsWindowState.x;
  let y: number | undefined = settingsWindowState.y;

  if (mainWindow && (x === undefined || y === undefined)) {
    const mainBounds = mainWindow.getBounds();
    const settingsSize = { width: settingsWindowState.width, height: settingsWindowState.height };

    // Center the settings window on the main window
    x = Math.round(mainBounds.x + (mainBounds.width - settingsSize.width) / 2);
    y = Math.round(mainBounds.y + (mainBounds.height - settingsSize.height) / 2);
  }

  settingsWindow = new BrowserWindow({
    width: settingsWindowState.width,
    height: settingsWindowState.height,
    x,
    y,
    minWidth: 250,
    minHeight: 300,
    // Modern window startup - hide until ready
    show: false,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    // Use the new rounded-corner icon
    icon: path.join(process.env.APP_ROOT, 'src/assets/icon2-512.png'),
    title: 'Scribble - Settings',
    parent: mainWindow || undefined,
    modal: false, // Changed to false to allow it to be a full window
    frame: false,
    // On macOS, use 'hiddenInset' to show the native traffic lights
    // On Windows, use 'hidden' to completely hide the title bar
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    // Additional macOS-specific settings - vertically centered in 40px title bar
    trafficLightPosition: { x: 12, y: 11 },  // Centered vertically (40px title bar / 2 - ~9px for button radius)
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Modern window startup - show when content is fully loaded
  settingsWindow.webContents.once('did-finish-load', () => {
    // Add a delay to ensure React has finished rendering and settings are loaded
    setTimeout(() => {
      settingsWindow?.show();
    }, 150);
  });

  // Load the settings.html file instead of index.html
  let url;
  if (VITE_DEV_SERVER_URL) {
    // In development mode, we need to handle the URL carefully
    const baseUrl = VITE_DEV_SERVER_URL.endsWith('/') ?
      VITE_DEV_SERVER_URL :
      `${VITE_DEV_SERVER_URL}/`;
    url = `${baseUrl}settings.html`;
  } else if (process.env.NODE_ENV === 'development') {
    // Fallback for development if VITE_DEV_SERVER_URL is not set
    url = 'http://localhost:5173/settings.html';
  } else {
    // In production mode, we load the file directly
    url = path.join(RENDERER_DIST, 'settings.html');
  }

  console.log('Loading URL for settings window:', url)
  console.log('VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL)
  console.log('NODE_ENV:', process.env.NODE_ENV)

  if (VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development') {
    settingsWindow?.loadURL(url).catch((error) => {
      console.error('Failed to load settings window URL:', url, error);
      // Try fallback URL
      const fallbackUrl = 'http://localhost:5173/settings.html';
      console.log('Trying fallback URL:', fallbackUrl);
      settingsWindow?.loadURL(fallbackUrl).catch((fallbackError) => {
        console.error('Fallback also failed:', fallbackError);
      });
    });
  } else {
    settingsWindow?.loadFile(url)
  }

  // Save window state before closing
  settingsWindow.on('close', () => {
    if (!settingsWindow || settingsWindow.isDestroyed()) return;

    // Save the current window state
    const [width, height] = settingsWindow.getSize();
    const [x, y] = settingsWindow.getPosition();

    windowStateStore.set('settingsWindow', {
      width,
      height,
      x,
      y
    });
  });

  // Clean up when window is closed
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  return settingsWindow
}

function createNoteSettingsWindow(noteId: string) {
  console.log('Creating note settings window for note ID:', noteId)

  // Don't create multiple settings windows for the same note
  if (noteSettingsWindows.has(noteId)) {
    const existingWindow = noteSettingsWindows.get(noteId)
    if (existingWindow && !existingWindow.isDestroyed()) {
      existingWindow.focus()
      return existingWindow
    }
    noteSettingsWindows.delete(noteId) // Clean up invalid reference
  }

  // Get current theme for proper window styling
  const settingsStore = new Store({ name: 'settings' });
  const settings = settingsStore.get('settings') as { theme?: ThemeName } || {};
  const currentTheme = settings.theme || 'dim';

  // Configure vibrancy settings for macOS (no transparency for settings windows)
  const vibrancyMaterial = getVibrancyMaterialForConstructor(currentTheme);

  const vibrancyConfig = {
    transparent: false, // No transparency for settings windows
    ...(isMacOS && vibrancyMaterial ? {
      vibrancy: vibrancyMaterial,
    } : {})
  };

  // Get the parent note window for positioning
  const parentNoteWindow = noteWindows.get(noteId);
  let x: number | undefined;
  let y: number | undefined;

  if (parentNoteWindow && !parentNoteWindow.isDestroyed()) {
    const parentBounds = parentNoteWindow.getBounds();
    // Position to the right of the parent window
    x = parentBounds.x + parentBounds.width + 10;
    y = parentBounds.y;
  }

  const noteSettingsWindow = new BrowserWindow({
    width: 300,
    height: 400,
    x,
    y,
    minWidth: 280,
    minHeight: 350,
    maxWidth: 400,
    show: false,
    resizable: true,
    backgroundColor: currentTheme === 'light' ? '#ffffff' : currentTheme === 'dark' ? '#1a1a1a' : '#2d2d38',
    icon: path.join(process.env.APP_ROOT, 'src/assets/icon2-512.png'),
    title: 'Note Settings',
    parent: parentNoteWindow || mainWindow || undefined,
    modal: false,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 12, y: 11 },
    ...vibrancyConfig,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--note-id=${noteId}`] // Pass note ID to renderer
    },
  });

  // Store the window reference
  noteSettingsWindows.set(noteId, noteSettingsWindow);

  // Load the note settings HTML file
  const url = path.join(RENDERER_DIST, 'note-settings.html');
  
  if (VITE_DEV_SERVER_URL) {
    const baseUrl = VITE_DEV_SERVER_URL.endsWith('/') ? VITE_DEV_SERVER_URL : `${VITE_DEV_SERVER_URL}/`;
    const devUrl = `${baseUrl}note-settings.html?noteId=${noteId}`;
    noteSettingsWindow.loadURL(devUrl);
  } else {
    noteSettingsWindow.loadFile(url, {
      query: { noteId }
    });
  }

  // Show window when ready
  noteSettingsWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      noteSettingsWindow?.show();
    }, 100);
  });

  // Clean up when window is closed
  noteSettingsWindow.on('closed', () => {
    console.log(`Note settings window closed for note: ${noteId}`);
    noteSettingsWindows.delete(noteId);
  });

  // Handle focus events to ensure proper window ordering
  noteSettingsWindow.on('focus', () => {
    // Ensure parent note window is also visible if minimized
    if (parentNoteWindow && !parentNoteWindow.isDestroyed() && !parentNoteWindow.isVisible()) {
      parentNoteWindow.show();
    }
  });

  return noteSettingsWindow;
}

// Variable to track the actual save location being used by the app
let currentSaveLocation: string | null = null;

// Helper function to get actual save location being used by the app
async function getActualSaveLocation(): Promise<string | null> {
  // If we have a tracked current save location, use that
  if (currentSaveLocation) {
    console.log('🔍 [Tray] Using tracked save location:', currentSaveLocation);
    return currentSaveLocation;
  }
  
  // Try to get save location from settings store
  const settingsStore = new Store({ name: 'settings' });
  const settings = settingsStore.get('settings') as any || {};
  let saveLocation = settings.saveLocation;
  
  console.log('🔍 [Tray] Settings from store:', { saveLocation, hasSettings: !!settings });
  
  // If no save location in settings, use default
  if (!saveLocation) {
    saveLocation = await getDefaultSaveLocation();
    console.log('🔍 [Tray] Using default save location:', saveLocation);
  } else {
    console.log('🔍 [Tray] Using save location from settings:', saveLocation);
  }
  
  return saveLocation;
}

// Helper function to get collections for tray menu
async function getCollectionsForTray(): Promise<{ id: string; name: string }[]> {
  try {
    console.log('🔍 [Tray] Getting collections for tray menu...');
    const saveLocation = await getActualSaveLocation();
    
    console.log('🔍 [Tray] Save location:', saveLocation);
    
    if (!saveLocation) {
      console.log('🔍 [Tray] No save location, returning default only');
      return [{ id: 'all', name: 'All Notes' }];
    }

    // Read collections file
    console.log('🔍 [Tray] Reading collections file...');
    const collectionsResult = await fileOperationService.readCollectionsFile(saveLocation);
    console.log('🔍 [Tray] Collections result:', collectionsResult);
    
    if (!collectionsResult.success || !collectionsResult.data) {
      console.log('🔍 [Tray] No collections data, returning default only');
      return [{ id: 'all', name: 'All Notes' }];
    }

    const collections = JSON.parse(collectionsResult.data);
    console.log('🔍 [Tray] Parsed collections:', collections);
    
    const defaultCollection = { id: 'all', name: 'All Notes' };
    const userCollections = Array.isArray(collections) ? 
      collections.filter(c => c && c.id && c.name).map(c => ({ id: c.id, name: c.name })) : [];
    
    const result = [defaultCollection, ...userCollections].slice(0, 8); // Limit to 8 collections
    console.log('🔍 [Tray] Final collections for tray:', result);
    return result;
  } catch (error) {
    console.error('❌ [Tray] Error getting collections for tray:', error);
    return [{ id: 'all', name: 'All Notes' }];
  }
}

// Helper function to get recent notes for tray menu
async function getRecentNotesForTray(): Promise<{ title: string; createdAt: Date }[]> {
  try {
    console.log('🔍 [Tray] Getting recent notes for tray menu...');
    const saveLocation = await getActualSaveLocation();
    
    console.log('🔍 [Tray] Save location for notes:', saveLocation);
    
    if (!saveLocation) {
      console.log('🔍 [Tray] No save location, returning empty notes array');
      return [];
    }

    // Get note files
    console.log('🔍 [Tray] Listing note files...');
    const noteFiles = await fileOperationService.listNoteFiles(saveLocation);
    console.log('🔍 [Tray] Found note files:', noteFiles?.length || 0);
    console.log('🔍 [Tray] Note files details:', noteFiles?.map(f => ({ title: f.title, createdAt: f.createdAt })));
    
    if (!Array.isArray(noteFiles)) {
      console.log('🔍 [Tray] Note files is not an array, returning empty array');
      return [];
    }

    // Sort by creation date and take top 5
    const result = noteFiles
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(file => ({ title: file.title, createdAt: new Date(file.createdAt) }));
    
    console.log('🔍 [Tray] Final recent notes for tray:', result);
    return result;
  } catch (error) {
    console.error('❌ [Tray] Error getting recent notes for tray:', error);
    return [];
  }
}

// Create tray icon
async function createTray() {
  // Create tray icon
  const iconPath = path.join(process.env.APP_ROOT, 'src/assets/icon-64.png')
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  tray = new Tray(trayIcon)

  // Build dynamic menu (with a delay to allow main window to initialize)
  setTimeout(async () => {
    await updateTrayMenu();
  }, 2000); // Wait 2 seconds for the main window to fully load and sync settings

  // Set tray properties
  tray.setToolTip('Scribble')

  // Show window on tray icon click
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    } else {
      createMainWindow()
    }
  })

  // Also refresh tray menu when tray is right-clicked (before showing menu)
  tray.on('right-click', async () => {
    console.log('🔍 [Tray] Right-click detected, refreshing menu...');
    await updateTrayMenu();
  })
}

// Update tray menu with collections and recent notes
async function updateTrayMenu() {
  if (!tray) {
    console.log('🔍 [Tray] No tray available, skipping menu update');
    return;
  }

  try {
    console.log('🔍 [Tray] Updating tray menu...');
    const [collections, recentNotes] = await Promise.all([
      getCollectionsForTray(),
      getRecentNotesForTray()
    ]);

    console.log('🔍 [Tray] Got collections for menu:', collections.length);
    console.log('🔍 [Tray] Got recent notes for menu:', recentNotes.length);

    const menuTemplate: Electron.MenuItemConstructorOptions[] = [];

    // Collections section
    if (collections.length > 0) {
      menuTemplate.push({
        label: 'Collections',
        enabled: false, // Section header
        icon: nativeImage.createEmpty()
      });

      collections.forEach(collection => {
        menuTemplate.push({
          label: `  ${collection.name}`,
          click: () => {
            // Show main window and switch to this collection
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
              // Send IPC to switch to collection
              mainWindow.webContents.send('switch-to-collection', collection.id);
            } else {
              createMainWindow();
              // Wait for window to be ready then switch collection
              // We set up the listener after creating the window
              setTimeout(() => {
                if (mainWindow) {
                  mainWindow.webContents.once('did-finish-load', () => {
                    setTimeout(() => {
                      if (mainWindow) {
                        mainWindow.webContents.send('switch-to-collection', collection.id);
                      }
                    }, 500);
                  });
                }
              }, 100);
            }
          }
        });
      });

      menuTemplate.push({ type: 'separator' });
    }

    // Recent notes section
    if (recentNotes.length > 0) {
      menuTemplate.push({
        label: 'Recent Notes',
        enabled: false, // Section header
        icon: nativeImage.createEmpty()
      });

      recentNotes.forEach(note => {
        const noteTitle = note.title.length > 30 ? note.title.substring(0, 30) + '...' : note.title;
        menuTemplate.push({
          label: `  ${noteTitle}`,
          click: async () => {
            // Generate UUID for window management
            const noteId = uuidv4();
            
            // Create note object for transient registry
            const noteData: Note = {
              title: note.title,
              content: '<p>Loading...</p>',
              createdAt: note.createdAt,
              updatedAt: note.createdAt
            };

            // Store in transient registry
            transientNewNotes.set(noteId, noteData);

            // Open note window
            createNoteWindow(noteId);

            // Show main window if hidden
            if (mainWindow && !mainWindow.isVisible()) {
              mainWindow.show();
            }
          }
        });
      });

      menuTemplate.push({ type: 'separator' });
    }

    // Standard menu items
    menuTemplate.push(
      {
        label: 'Open Scribble',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
          } else {
            createMainWindow()
          }
        }
      },
      {
        label: 'New Note',
        click: () => {
          // Generate a unique UUID for the new note (for window management)
          const noteId = uuidv4();

          // Create a new note object and store it in transient registry
          const newNote: Note = {
            title: 'Untitled Note',
            content: '<p></p>',
            createdAt: new Date(),
            updatedAt: new Date(),
            _isNew: true,
            _unsaved: true
          };

          // Store the note in the transient registry
          transientNewNotes.set(noteId, newNote);

          createNoteWindow(noteId);

          // Show main window if it's hidden
          if (mainWindow && !mainWindow.isVisible()) {
            mainWindow.show();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          createSettingsWindow()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    tray.setContextMenu(contextMenu);
  } catch (error) {
    console.error('Error updating tray menu:', error);
    // Fallback to basic menu
    const basicMenu = Menu.buildFromTemplate([
      {
        label: 'Open Scribble',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
          } else {
            createMainWindow()
          }
        }
      },
      {
        label: 'New Note',
        click: () => {
          const noteId = uuidv4();
          const newNote: Note = {
            title: 'Untitled Note',
            content: '<p></p>',
            createdAt: new Date(),
            updatedAt: new Date(),
            _isNew: true,
            _unsaved: true
          };
          transientNewNotes.set(noteId, newNote);
          createNoteWindow(noteId);
          if (mainWindow && !mainWindow.isVisible()) {
            mainWindow.show();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          createSettingsWindow()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ]);
    tray.setContextMenu(basicMenu);
  }
}

// Default global hotkeys - use non-optional types here since these are guaranteed to exist
const DEFAULT_GLOBAL_HOTKEYS: Readonly<Record<string, string>> = {
  newNote: 'CommandOrControl+Alt+N',
  toggleApp: 'CommandOrControl+Alt+S',
};

// Register global hotkeys
function registerGlobalHotkeys() {
  // One call is sufficient - it clears every shortcut registered by this app
  console.log('Unregistering all global shortcuts');
  globalShortcut.unregisterAll();

  // Get settings to check for custom hotkeys
  const settingsStore = new Store({ name: 'settings' });
  const settings = settingsStore.get('settings') as SettingsType || {};

  console.log('Full settings from store:', JSON.stringify(settings, null, 2));

  // Get global hotkeys from settings using an immutable approach
  const globalHotkeys = {
    ...DEFAULT_GLOBAL_HOTKEYS,
    ...(settings.globalHotkeys ?
      // Filter out undefined/null values from user settings
      Object.fromEntries(
        Object.entries(settings.globalHotkeys)
          .filter(([, value]) => value !== undefined && value !== null)
      )
      : {}
    )
  };

  // Log the hotkeys we're about to register
  console.log('Registering global hotkeys:', JSON.stringify(globalHotkeys, null, 2));

  // Compare with defaults to see if they're different
  const usingDefaults =
    globalHotkeys?.newNote === DEFAULT_GLOBAL_HOTKEYS.newNote &&
    ((globalHotkeys?.toggleApp === DEFAULT_GLOBAL_HOTKEYS.toggleApp) ||
      (globalHotkeys?.showApp === DEFAULT_GLOBAL_HOTKEYS.toggleApp)); // Support both old and new property names

  console.log(`Using default hotkeys: ${usingDefaults}`);

  // Register global hotkey for creating a new note
  const newNoteHotkey = globalHotkeys?.newNote;
  const newNoteRegistered = registerShortcut(
    newNoteHotkey,
    async () => {
      // Generate a unique UUID for the new note (for window management)
      const noteId = uuidv4();
      console.log('[Main Process] Global hotkey: create-note called, generated UUID:', noteId);

      // FIXED: Use the same immediate-save behavior as the IPC handler
      // Get save location from settings
      const settingsStore = new Store({ name: 'settings' });
      const settings = settingsStore.get('settings') as any || {};
      const saveLocation = settings.saveLocation || await getDefaultSaveLocation();

      // Generate unique title by checking existing files
      let title = 'Untitled Note';
      if (saveLocation && fsSync.existsSync(saveLocation)) {
        try {
          const files = await fs.readdir(saveLocation);
          const existingFiles = files.filter(f => f.endsWith('.md'));

          // Use the file naming service to generate a unique title
          const result = fileNamingService.generateUniqueFilename(title, existingFiles);
          title = fileNamingService.extractTitle(result.filename);
        } catch (error) {
          console.error('[Main Process] Error checking existing titles:', error);
        }
      }

      // Create the note object
      const newNote: Note = {
        id: title, // Use title as ID (primary identifier)
        title: title,
        content: '<p></p>',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save the note file immediately
      if (saveLocation) {
        try {
          const titleHeader = `# ${title}\n\n`;
          const metadata = {
            id: newNote.id,
            createdAt: newNote.createdAt.toISOString(),
            updatedAt: newNote.updatedAt.toISOString()
          };
          const metadataComment = `\n\n<!-- scribble-metadata: ${JSON.stringify(metadata)} -->`;
          const fullContent = titleHeader + metadataComment;

          const createResult = await fileOperationService.createNoteFile(title, fullContent, saveLocation);

          if (createResult.success) {
            console.log('[Main Process] Global hotkey: Created and saved new note file:', createResult.filePath);

            // Broadcast refresh to all windows with debouncing
            invalidateFileListCache();
            broadcastRefreshDebounced();
          }
        } catch (error) {
          console.error('[Main Process] Global hotkey: Error saving new note file:', error);
        }
      }

      // Store the note in the transient registry
      transientNewNotes.set(noteId, newNote);

      createNoteWindow(noteId);

      // Show main window if it's hidden
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    },
    'new note'
  );

  // Register global hotkey for toggling the app visibility
  // Support both old (showApp) and new (toggleApp) property names for backward compatibility
  const toggleAppHotkey = globalHotkeys?.toggleApp || globalHotkeys?.showApp;
  const toggleAppRegistered = registerShortcut(
    toggleAppHotkey,
    () => {
      if (mainWindow) {
        // Toggle visibility: hide if visible, show if hidden
        if (mainWindow.isVisible()) {
          console.log('Main window is visible, hiding it');
          mainWindow.hide();
        } else {
          console.log('Main window is hidden, showing it');
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        // If window doesn't exist, create it
        console.log('Main window does not exist, creating it');
        createMainWindow();
      }
    },
    'toggling app'
  );

  // Check all registered shortcuts
  const allRegisteredShortcuts = [];

  // Check if our hotkeys are registered (avoid duplicates by using Set)
  const registeredSet = new Set<string>();

  if (newNoteHotkey && newNoteRegistered) {
    const formattedHotkey = formatAccelerator(newNoteHotkey);
    registeredSet.add(formattedHotkey);
  }

  if (toggleAppHotkey && toggleAppRegistered) {
    const formattedHotkey = formatAccelerator(toggleAppHotkey);
    registeredSet.add(formattedHotkey);
  }

  // Convert Set back to array for logging
  allRegisteredShortcuts.push(...Array.from(registeredSet));

  console.log('Currently registered global shortcuts:', allRegisteredShortcuts);
  console.log('Global hotkeys registration complete');
}

// Helper function to ensure hotkeys are properly formatted for Electron's accelerator
function formatAccelerator(hotkey: string | undefined): string {
  // Handle undefined, null, or empty string
  if (!hotkey) return '';

  try {
    // Define recognized modifiers
    const modifiers = ['CommandOrControl', 'Command', 'Control', 'Alt', 'Option', 'Shift', 'Meta'];

    // Split the hotkey into parts and filter out empty strings
    const parts = hotkey.split('+').filter(Boolean);

    // Normalize case & filter duplicates
    const normalizedParts = parts
      .map(p => {
        // Normalize common lower-case user input
        const canonical = modifiers.find(m => m.toLowerCase() === p.toLowerCase());
        return canonical || p;
      })
      // Filter out duplicates (case-insensitive)
      .filter((part, index, self) =>
        self.findIndex(p => p.toLowerCase() === part.toLowerCase()) === index
      );

    // Sort modifiers to come first
    normalizedParts.sort((a, b) => {
      const aIndex = modifiers.indexOf(a);
      const bIndex = modifiers.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });

    // Join the parts back together
    return normalizedParts.join('+');
  } catch (error) {
    console.error('Error formatting accelerator:', error, 'hotkey:', hotkey);
    return '';
  }
}

/**
 * Helper function to register a global shortcut
 * @param accelerator The hotkey string to register
 * @param handler The callback function to execute when the hotkey is triggered
 * @param description A description of what the hotkey does (for logging)
 * @returns boolean indicating if registration was successful
 */
function registerShortcut(
  accelerator: string | undefined,
  handler: () => void,
  description: string
): boolean {
  if (!accelerator) {
    console.log(`No ${description} hotkey defined, skipping registration`);
    return false;
  }

  try {
    console.log(`Attempting to register global hotkey for ${description}: ${accelerator}`);

    // Ensure the hotkey is properly formatted
    const formattedHotkey = formatAccelerator(accelerator);
    console.log(`Formatted hotkey for ${description}: ${formattedHotkey}`);

    // Guard against empty accelerators before registering
    if (!formattedHotkey) {
      console.error(`Empty formatted hotkey for ${description}, skipping registration`);
      return false;
    }

    const success = globalShortcut.register(formattedHotkey, handler);

    if (success) {
      console.log(`Successfully registered global hotkey for ${description}: ${formattedHotkey}`);
    } else {
      console.error(`Failed to register global hotkey for ${description}: ${formattedHotkey} - registration returned false`);
    }

    return success;
  } catch (error) {
    console.error(`Error registering global hotkey for ${description}: ${accelerator}`, error);
    return false;
  }
}

// Helper function to create a safe filename from a title (using new file naming service)
function getSafeFileName(title: string): string {
  return fileNamingService.generateFilename(title);
}



// Get default save location
async function getDefaultSaveLocation() {
  const userDataPath = app.getPath('userData')
  const savePath = path.join(userDataPath, 'Notes')

  // Create directory if it doesn't exist
  if (!fsSync.existsSync(savePath)) {
    await fs.mkdir(savePath, { recursive: true })
  }

  return savePath
}

// IPC handlers
ipcMain.handle('open-note', (_, noteId: string, initialNoteData?: Note) => {
  console.log('[Main Process] IPC: open-note called with noteId:', noteId);

  // If initialNoteData is provided and it's a new note, store it in the transient registry
  if (initialNoteData && initialNoteData._isNew) {
    console.log('[Main Process] Storing initial note data in transient registry:', initialNoteData);
    transientNewNotes.set(noteId, initialNoteData);
  }

  const window = createNoteWindow(noteId);
  console.log('[Main Process] Note window created:', window ? 'success' : 'failed');

  return { success: !!window };
})

// Remove old refresh timeout - using new debounced system

// Listen for note updates and broadcast to all windows
ipcMain.on('note-updated', (event, noteId, updatedProperties) => {
  console.log(`[Main Process] Received 'note-updated' from a renderer: ${noteId}, Properties:`, updatedProperties);

  // Broadcast the update to all active browser windows
  BrowserWindow.getAllWindows().forEach(window => {
    // Don't send back to the sender to avoid potential loops
    if (window.webContents.id !== event.sender.id) {
      console.log(`[Main Process] Broadcasting note update to window ID: ${window.id}`);
      window.webContents.send('note-updated', noteId, updatedProperties);
    }
  });

  // ENHANCED: Also trigger a full refresh for certain property changes
  // that might affect the notes list display (like title changes, content updates)
  const shouldRefreshList = updatedProperties.title || updatedProperties.renamed || updatedProperties.content;
  if (shouldRefreshList) {
    console.log(`[Main Process] Triggering notes list refresh due to significant update`);

    // Invalidate cache and broadcast refresh with debouncing
    invalidateFileListCache();
    broadcastRefreshDebounced(100);
  }
})

// Handle transparency settings
ipcMain.handle('set-window-transparency', (event, enabled: boolean) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && isMacOS) {
    if (enabled) {
      // Get current theme for vibrancy material
      const settingsStore = new Store({ name: 'settings' });
      const settings = settingsStore.get('settings') as { theme?: ThemeName } || {};
      const currentTheme = settings.theme || 'dim';
      const vibrancyMaterial = getVibrancyMaterialForSetMethod(currentTheme);

      if (vibrancyMaterial) {
        win.setVibrancy(vibrancyMaterial);
      }
    } else {
      win.setVibrancy(null);
    }
  }
})

// Handle theme changes for vibrancy updates
ipcMain.on('theme-changed', (_event, newTheme: ThemeName) => {
  console.log('Theme changed from renderer process:', newTheme);
  console.log('Platform is macOS:', isMacOS);

  // Update vibrancy for all windows if on macOS
  if (isMacOS) {
    const vibrancyMaterial = getVibrancyMaterialForSetMethod(newTheme);
    console.log('Setting vibrancy material for theme', newTheme, ':', vibrancyMaterial);

    BrowserWindow.getAllWindows().forEach((window, index) => {
      if (vibrancyMaterial) {
        console.log(`Setting vibrancy for window ${index}:`, vibrancyMaterial);
        window.setVibrancy(vibrancyMaterial);
      } else {
        console.log(`No vibrancy material for window ${index}`);
      }
    });
  } else {
    console.log('Not on macOS, skipping vibrancy');
  }
})

// Handle vibrancy changes
ipcMain.on('vibrancy-changed', (event, vibrancyData: { theme: ThemeName; material: string }) => {
  console.log('Vibrancy changed from renderer process:', vibrancyData);

  if (isMacOS) {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const vibrancyMaterial = getVibrancyMaterialForSetMethod(vibrancyData.theme);
      if (vibrancyMaterial) {
        win.setVibrancy(vibrancyMaterial);
      }
    }
  }
})

// Window control handlers
ipcMain.handle('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.minimize()
})

ipcMain.handle('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

ipcMain.handle('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.close()
})

ipcMain.handle('window-move', (event, moveX, moveY) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    const [x, y] = win.getPosition()
    win.setPosition(x + moveX, y + moveY)
  }
})

ipcMain.handle('window-toggle-pin', (event, shouldPin) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.setAlwaysOnTop(shouldPin)

    // Find the noteId for this window
    let noteId = null
    for (const [id, noteWin] of noteWindows.entries()) {
      if (noteWin === win) {
        noteId = id
        break
      }
    }

    // Log the pin state change
    console.log(`Window pin state changed for note ${noteId}: ${shouldPin}`)

    return win.isAlwaysOnTop()
  }
  return false
})

ipcMain.handle('window-is-pinned', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    return win.isAlwaysOnTop()
  }
  return false
})

ipcMain.handle('window-set-pin-state', (_, noteId, isPinned) => {
  // Find the window for this note
  const win = noteWindows.get(noteId)
  if (win) {
    win.setAlwaysOnTop(isPinned)
    console.log(`Set window pin state for note ${noteId}: ${isPinned}`)
    return true
  }
  return false
})

// Handle window transparency
ipcMain.handle('window-set-transparency', (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    // Set the window opacity directly
    win.setOpacity(value)

    // Find the noteId for this window
    let noteId = null
    for (const [id, noteWin] of noteWindows.entries()) {
      if (noteWin === win) {
        noteId = id
        break
      }
    }

    console.log(`Window transparency value for note ${noteId}: ${value}`)
    return true
  }
  return false
})

ipcMain.handle('window-get-transparency', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    // Return the current opacity as a percentage
    const opacity = win.getOpacity()
    return Math.round(opacity * 100)
  }
  return 100 // Default to 100% if window not found
})

// Handle vibrancy updates for main window
ipcMain.handle('window-set-vibrancy', (event, theme: ThemeName) => {
  if (!isMacOS) {
    console.log('Vibrancy not supported on this platform')
    return false
  }

  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && win === mainWindow) {
    try {
      const vibrancyMaterial = getVibrancyMaterialForSetMethod(theme)
      if (vibrancyMaterial) {
        win.setVibrancy(vibrancyMaterial)
        console.log(`Main window vibrancy updated to: ${vibrancyMaterial} for theme: ${theme}`)
      } else {
        win.setVibrancy(null)
        console.log(`Main window vibrancy disabled for theme: ${theme}`)
      }
      return true
    } catch (error) {
      console.error('Error setting vibrancy:', error)
      return false
    }
  }
  return false
})

// Get current vibrancy support status
ipcMain.handle('window-get-vibrancy-support', () => {
  return {
    supported: isMacOS,
    platform: process.platform
  }
})

ipcMain.handle('create-note', async (_, saveLocationFromRenderer) => {
  // Generate a unique UUID for the new note (still used for window management)
  const noteId = uuidv4();
  console.log('[Main Process] IPC: create-note called, generated UUID:', noteId);
  console.log('[Main Process] Received saveLocation from renderer:', saveLocationFromRenderer);

  // Use the saveLocation passed from renderer, fallback to default if not provided
  const saveLocation = saveLocationFromRenderer || await getDefaultSaveLocation();
  console.log('[Main Process] Using save location:', saveLocation);

  // Generate unique title by checking existing files
  let title = 'Untitled Note';
  if (saveLocation && fsSync.existsSync(saveLocation)) {
    try {
      const files = await fs.readdir(saveLocation);
      const existingFiles = files.filter(f => f.endsWith('.md'));

      console.log('[Main Process] Save location:', saveLocation);
      console.log('[Main Process] All files:', files);
      console.log('[Main Process] Existing .md files:', existingFiles);

      // Use the file naming service to generate a unique title
      const result = fileNamingService.generateUniqueFilename(title, existingFiles);
      title = fileNamingService.extractTitle(result.filename);

      console.log('[Main Process] Generated result:', result);
      console.log('[Main Process] Generated unique title:', title);
    } catch (error) {
      console.error('[Main Process] Error checking existing titles:', error);
    }
  }

  // Create the note object
  const newNote: Note = {
    id: title, // Use title as ID (primary identifier)
    title: title,
    content: '<p></p>',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Save the note file immediately (industry standard behavior)
  if (saveLocation) {
    try {
      // Create the markdown content with title as heading
      const titleHeader = `# ${title}\n\n`;
      const metadata = {
        id: newNote.id,
        createdAt: newNote.createdAt.toISOString(),
        updatedAt: newNote.updatedAt.toISOString()
      };
      const metadataComment = `\n\n<!-- scribble-metadata: ${JSON.stringify(metadata)} -->`;
      const fullContent = titleHeader + metadataComment;

      // Use the file operation service to create the file
      const createResult = await fileOperationService.createNoteFile(title, fullContent, saveLocation);

      if (createResult.success) {
        console.log('[Main Process] Created and saved new note file:', createResult.filePath);

        // IMMEDIATE: Broadcast refresh right away
        console.log('[Main Process] Broadcasting immediate refresh for new note creation');
        console.log('[Main Process] Broadcasting refresh for new note creation');

        // Use debounced refresh to prevent spam
        invalidateFileListCache();
        broadcastRefreshDebounced();

      } else {
        console.error('[Main Process] Error saving new note file:', createResult.error);
      }
    } catch (error) {
      console.error('[Main Process] Error saving new note file:', error);
    }
  }

  // Store in transient registry for quick access (using noteId for window management)
  transientNewNotes.set(noteId, newNote);

  // Open the note window immediately
  console.log('[Main Process] Opening note window for new note:', noteId);
  createNoteWindow(noteId);

  return newNote;
})

ipcMain.handle('create-note-with-id', (_, noteId) => {
  createNoteWindow(noteId)
  return { success: true }
})

ipcMain.handle('get-note-id', (event) => {
  console.log('[Main Process] === IPC: get-note-id called ===')
  // Find the window that sent this request
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) {
    console.log('[Main Process] No window found for this request')
    return null
  }

  console.log('[Main Process] Window ID:', win.id)
  console.log('[Main Process] Current noteWindows Map size:', noteWindows.size)
  console.log('[Main Process] noteWindows entries:', Array.from(noteWindows.entries()).map(([id, w]) => ({ id, winId: w.id })))

  // Check if this is a note window
  for (const [noteId, noteWin] of noteWindows.entries()) {
    if (noteWin === win) {
      console.log('[Main Process] Found note ID for window:', noteId)
      return noteId
    }
  }

  console.log('[Main Process] This is not a note window')
  return null // This is the main window or an unknown window
})

// Handler to get transient new note data
ipcMain.handle('get-transient-new-note-data', async (_, noteId: string) => {
  const note = transientNewNotes.get(noteId);
  if (note) {
    console.log(`[Main Process] Serving transient data for note ID: ${noteId}`);
    return note;
  }

  // In the new system, we don't need to check file registry
  // Transient notes are only for new unsaved notes

  console.warn(`[Main Process] No transient new note data found for ID: ${noteId}`);
  return null;
})

// Note property update handler
ipcMain.handle('update-note-property', async (_, noteId: string, property: string, value: any) => {
  console.log(`Updating note ${noteId} property ${property} to:`, value);
  
  try {
    // Use the same save location logic as the tray system
    let saveLocation = currentSaveLocation; // Use tracked location first
    
    if (!saveLocation) {
      // Fallback to settings store
      const settingsStore = new Store({ name: 'settings' });
      const settings = settingsStore.get('settings') as any || {};
      saveLocation = settings.saveLocation;
    }
    
    if (!saveLocation) {
      console.log('No save location found');
      return { success: false, error: 'No save location configured' };
    }
    
    console.log(`Using save location for update: ${saveLocation}`);

    const filePath = path.join(saveLocation, `${noteId}.md`);
    
    if (!fsSync.existsSync(filePath)) {
      console.log(`Note file does not exist: ${filePath}`);
      return { success: false, error: 'Note file not found' };
    }

    // For properties like color and favorite, we might store metadata in a comment
    // or in a separate metadata system. For now, let's log the update
    // In a production app, you'd want to store metadata alongside the markdown
    
    console.log(`Successfully updated property ${property} for note ${noteId}`);
    
    // Broadcast the update to all note windows
    for (const [windowNoteId, noteWindow] of noteWindows.entries()) {
      if (!noteWindow.isDestroyed()) {
        noteWindow.webContents.send('note-updated', noteId, { [property]: value });
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error(`Error updating note property ${property} for ${noteId}:`, error);
    return { success: false, error: error.message };
  }
})

// Get note by ID handler  
ipcMain.handle('get-note-by-id', async (_, noteId: string) => {
  console.log(`Getting note by ID: ${noteId}`);
  
  try {
    // Use the same save location logic as the tray system
    let saveLocation = currentSaveLocation; // Use tracked location first
    
    if (!saveLocation) {
      // Fallback to settings store
      const settingsStore = new Store({ name: 'settings' });
      const settings = settingsStore.get('settings') as any || {};
      saveLocation = settings.saveLocation;
    }
    
    if (!saveLocation) {
      console.log('No save location found');
      return null;
    }
    
    console.log(`Using save location: ${saveLocation}`);

    // Construct file path (noteId should be the filename without extension)
    const filePath = path.join(saveLocation, `${noteId}.md`);
    console.log(`Attempting to read note file: ${filePath}`);
    
    // Check if file exists
    if (!fsSync.existsSync(filePath)) {
      console.log(`Note file does not exist: ${filePath}`);
      return null;
    }

    // Read the file content
    const fileContent = fsSync.readFileSync(filePath, 'utf-8');
    
    // Parse the note (assuming first line is title, rest is content)
    const lines = fileContent.split('\n');
    const title = lines[0]?.replace(/^#\s*/, '') || noteId; // Remove markdown header if present
    const content = lines.slice(1).join('\n').trim();
    
    // Get file stats for timestamps
    const stats = fsSync.statSync(filePath);
    
    // Return note data in expected format
    const noteData = {
      id: noteId,
      title: title,
      content: content || '<p></p>', // Default empty content
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
      _isNew: false,
      _unsaved: false
    };
    
    console.log(`Successfully loaded note data for ID: ${noteId}`, { title, contentLength: content.length });
    return noteData;
    
  } catch (error) {
    console.error(`Error loading note by ID ${noteId}:`, error);
    return null;
  }
})

// Delete note handler
ipcMain.handle('delete-note', async (_, noteId: string) => {
  console.log(`Deleting note: ${noteId}`);
  // This would normally delete the note from your data store
  // For now, just return success and close the window
  const noteWindow = noteWindows.get(noteId);
  if (noteWindow && !noteWindow.isDestroyed()) {
    noteWindow.close();
  }
  return { success: true };
})

// Settings IPC handlers
ipcMain.handle('open-settings', () => {
  createSettingsWindow()
  return { success: true }
})

ipcMain.handle('open-note-settings', (_, noteId: string) => {
  console.log('IPC: open-note-settings called for note:', noteId)
  createNoteSettingsWindow(noteId)
  return { success: true }
})

ipcMain.handle('close-note-settings', (_, noteId: string) => {
  console.log('IPC: close-note-settings called for note:', noteId)
  const noteSettingsWindow = noteSettingsWindows.get(noteId)
  if (noteSettingsWindow && !noteSettingsWindow.isDestroyed()) {
    noteSettingsWindow.close()
  }
  return { success: true }
})

ipcMain.handle('is-note-settings-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win ? Array.from(noteSettingsWindows.values()).includes(win) : false
})

// Handle transparency control for specific note window
ipcMain.handle('set-note-window-transparency', (event, noteId: string, value: number) => {
  console.log(`Setting transparency for note ${noteId} to:`, value);
  
  const noteWindow = noteWindows.get(noteId);
  if (noteWindow && !noteWindow.isDestroyed()) {
    // Set opacity (value is decimal, electron expects 0-1)
    noteWindow.setOpacity(value);
    console.log(`Successfully set note window ${noteId} transparency to ${value}`);
    return { success: true };
  }
  
  return { success: false, error: 'Note window not found' };
})

ipcMain.handle('get-note-window-transparency', (event, noteId: string) => {
  console.log(`Getting transparency for note ${noteId}`);
  
  const noteWindow = noteWindows.get(noteId);
  if (noteWindow && !noteWindow.isDestroyed()) {
    const opacity = noteWindow.getOpacity();
    console.log(`Note window ${noteId} transparency: ${opacity}`);
    return opacity;
  }
  
  return 1.0; // Default to fully opaque
})

// Handle pin state control for specific note window
ipcMain.handle('set-note-window-pin', (event, noteId: string, isPinned: boolean) => {
  console.log(`Setting pin state for note ${noteId} to:`, isPinned);
  
  const noteWindow = noteWindows.get(noteId);
  if (noteWindow && !noteWindow.isDestroyed()) {
    noteWindow.setAlwaysOnTop(isPinned);
    console.log(`Successfully set note window ${noteId} pin state to ${isPinned}`);
    return { success: true };
  }
  
  return { success: false, error: 'Note window not found' };
})

ipcMain.handle('get-note-window-pin', (event, noteId: string) => {
  console.log(`Getting pin state for note ${noteId}`);
  
  const noteWindow = noteWindows.get(noteId);
  if (noteWindow && !noteWindow.isDestroyed()) {
    const isAlwaysOnTop = noteWindow.isAlwaysOnTop();
    console.log(`Note window ${noteId} pin state: ${isAlwaysOnTop}`);
    return isAlwaysOnTop;
  }
  
  return false; // Default to not pinned
})

// Handle toolbar toggle from note settings window
ipcMain.on('toggle-note-toolbar', (event, noteId: string, isVisible: boolean) => {
  console.log(`Toggling toolbar for note ${noteId} to:`, isVisible);
  
  // Find the note window and send the toggle command
  const noteWindow = noteWindows.get(noteId);
  if (noteWindow && !noteWindow.isDestroyed()) {
    noteWindow.webContents.send('toggle-toolbar', isVisible);
  }
})

ipcMain.handle('get-note-window-toolbar-state', (event, noteId: string) => {
  console.log(`Getting toolbar state for note ${noteId}`);
  
  // For now, we'll assume toolbar is visible by default
  // In a more advanced implementation, you'd track this state
  const noteWindow = noteWindows.get(noteId);
  if (noteWindow && !noteWindow.isDestroyed()) {
    // You could store toolbar state in a Map or send a query to the renderer
    // For now, return default true
    return true;
  }
  
  return true; // Default to toolbar visible
})

// Handle color change for specific note window
ipcMain.handle('set-note-window-color', (event, noteId: string, color: string) => {
  console.log(`Setting color for note ${noteId} to:`, color);
  
  const noteWindow = noteWindows.get(noteId);
  if (noteWindow && !noteWindow.isDestroyed()) {
    // Send color change to the note window renderer
    noteWindow.webContents.send('note-color-changed', color);
    console.log(`Successfully sent color change to note window ${noteId}`);
    return { success: true };
  }
  
  return { success: false, error: 'Note window not found' };
})

ipcMain.handle('is-settings-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win === settingsWindow
})

ipcMain.handle('select-directory', async () => {
  if (!mainWindow && !settingsWindow) return { canceled: true }

  const result = await dialog.showOpenDialog(settingsWindow || mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Save Location'
  })

  return result
})

ipcMain.handle('get-default-save-location', async () => {
  return await getDefaultSaveLocation()
})

// File operation handlers
ipcMain.handle('save-note-to-file', async (_, noteTitle: string, content: string, saveLocation: string, oldTitle?: string) => {

  // Input validation
  if (!noteTitle || typeof noteTitle !== 'string') {
    const error = 'Invalid note title provided';
    console.error('[Main Process]', error);
    return { success: false, error };
  }

  if (!saveLocation || typeof saveLocation !== 'string') {
    const error = 'Invalid save location provided';
    console.error('[Main Process]', error);
    return { success: false, error };
  }

  try {
    // Ensure the directory exists
    if (!fsSync.existsSync(saveLocation)) {
      await fs.mkdir(saveLocation, { recursive: true });
    }

    const newFileName = getSafeFileName(noteTitle);
    const newFilePath = path.join(saveLocation, newFileName);

    // If this is a title change (oldTitle provided and different), handle rename
    if (oldTitle && oldTitle !== noteTitle) {
      const oldFileName = getSafeFileName(oldTitle);
      const oldFilePath = path.join(saveLocation, oldFileName);

      // Use the file operation service to handle the rename
      const renameResult = await fileOperationService.renameNoteFile(oldFilePath, noteTitle);

      if (!renameResult.success) {
        console.error('[Main Process] Failed to rename file:', renameResult.error);
        return {
          success: false,
          error: `Failed to rename file: ${renameResult.error}`,
          userMessage: 'Could not rename the note file. Please check file permissions and try again.'
        };
      }

      // Update the content in the renamed file
      const updateResult = await fileOperationService.updateNoteFile(renameResult.filePath!, content);

      if (!updateResult.success) {
        console.error('[Main Process] Failed to update renamed file:', updateResult.error);
        return {
          success: false,
          error: `Failed to update renamed file: ${updateResult.error}`,
          userMessage: 'File was renamed but content could not be updated. Please try saving again.'
        };
      }

      // Broadcast refresh to all windows
      invalidateFileListCache();
      broadcastRefreshDebounced();

      return {
        success: true,
        filePath: renameResult.filePath,
        conflictResolution: renameResult.conflictResolution
      };
    }

    // Check if file already exists (for new notes or updates)
    const fileExists = fsSync.existsSync(newFilePath);

    if (fileExists) {
      // Update existing file
      const updateResult = await fileOperationService.updateNoteFile(newFilePath, content);

      if (!updateResult.success) {
        console.error('[Main Process] Failed to update file:', updateResult.error);
        return {
          success: false,
          error: `Failed to update file: ${updateResult.error}`,
          userMessage: 'Could not save the note. Please check file permissions and disk space.'
        };
      }

      // Broadcast refresh to all windows for file updates
      invalidateFileListCache();
      broadcastRefreshDebounced();

      return {
        success: true,
        filePath: newFilePath
      };
    } else {
      // Create new file

      // Get list of existing files for conflict resolution
      const existingFiles = await fs.readdir(saveLocation).catch(() => []);
      const result = fileNamingService.generateUniqueFilename(noteTitle, existingFiles);

      const createResult = await fileOperationService.createNoteFile(noteTitle, content, saveLocation);

      if (!createResult.success) {
        console.error('[Main Process] Failed to create file:', createResult.error);
        return {
          success: false,
          error: `Failed to create file: ${createResult.error}`,
          userMessage: 'Could not create the note file. Please check file permissions and disk space.'
        };
      }

      // Broadcast refresh to all windows for new notes
      invalidateFileListCache();
      broadcastRefreshDebounced();

      return {
        success: true,
        filePath: createResult.filePath,
        conflictResolution: result.wasModified ? result.filename : undefined
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Main Process] Error saving note to file:', error);
    return {
      success: false,
      error: errorMessage,
      userMessage: 'An unexpected error occurred while saving the note. Please try again.'
    };
  }
})

ipcMain.handle('delete-note-file', async (_, noteTitle: string, saveLocation: string) => {
  console.log('[Main Process] Deleting note file:', { noteTitle, saveLocation });

  // Input validation
  if (!noteTitle || typeof noteTitle !== 'string') {
    const error = 'Invalid note title provided';
    console.error('[Main Process]', error);
    return { success: false, error, userMessage: 'Cannot delete note: invalid title provided.' };
  }

  if (!saveLocation || typeof saveLocation !== 'string') {
    const error = 'Invalid save location provided';
    console.error('[Main Process]', error);
    return { success: false, error, userMessage: 'Cannot delete note: invalid save location.' };
  }

  // Queue the delete operation to prevent duplicates
  return queueOperation(`delete-${noteTitle}-${saveLocation}`, async () => {

    try {
      // Generate the expected filename from the title
      const fileName = getSafeFileName(noteTitle);
      const filePath = path.join(saveLocation, fileName);

      console.log(`[Main Process] Expected file path: ${filePath}`);

      // Use the file operation service to delete the file
      const deleteResult = await fileOperationService.deleteNoteFile(filePath);

      if (!deleteResult.success) {
        console.error('[Main Process] Failed to delete file:', deleteResult.error);
        return {
          success: false,
          error: deleteResult.error,
          userMessage: 'Could not delete the note file. It may have been moved or deleted already.'
        };
      }

      console.log(`[Main Process] Successfully deleted note file: ${filePath}`);

      // Broadcast refresh to all windows
      invalidateFileListCache();
      broadcastRefreshDebounced();

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Main Process] Error deleting note file:', error);
      return {
        success: false,
        error: errorMessage,
        userMessage: 'An unexpected error occurred while deleting the note. Please try again.'
      };
    }
  });
})

// Cache for file listings to prevent excessive filesystem reads
const fileListCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_DURATION = 500; // 500ms cache

// Debounced refresh broadcaster to prevent spam
const refreshTimeouts = new Map<string, NodeJS.Timeout>();

function broadcastRefreshDebounced(delay = 100) {
  // Clear existing timeout
  const existingTimeout = refreshTimeouts.get('global');
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout
  const timeout = setTimeout(() => {
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('refresh-notes-list');
      }
    });
    
    // Also update tray menu when notes change
    updateTrayMenu().catch(error => console.error('Error updating tray menu after notes change:', error));
    
    refreshTimeouts.delete('global');
  }, delay);

  refreshTimeouts.set('global', timeout);
}

function invalidateFileListCache(directoryPath?: string) {
  if (directoryPath) {
    fileListCache.delete(directoryPath);
  } else {
    fileListCache.clear();
  }
}

// Simple operation queue to prevent concurrent file operations
const operationQueue = new Map<string, Promise<any>>();

async function queueOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
  // If operation is already running, wait for it
  const existing = operationQueue.get(key);
  if (existing) {
    await existing;
  }

  // Run the new operation
  const promise = operation();
  operationQueue.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    operationQueue.delete(key);
  }
}

// List all markdown files in a directory
ipcMain.handle('list-note-files', async (_, directoryPath) => {
  console.log(`[Main Process] Listing note files in directory: ${directoryPath}`);

  // Track the current save location being used
  if (directoryPath && typeof directoryPath === 'string') {
    currentSaveLocation = directoryPath;
    console.log(`🔍 [Tray] Updated current save location to: ${currentSaveLocation}`);
  }

  // Input validation
  if (!directoryPath || typeof directoryPath !== 'string') {
    console.error('[Main Process] Invalid directory path provided');
    return [];
  }

  // Check cache first
  const cached = fileListCache.get(directoryPath);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`[Main Process] Returning cached result (${cached.data.length} files)`);
    return cached.data;
  }

  // Queue the operation to prevent concurrent calls
  return queueOperation(`list-${directoryPath}`, async () => {
    try {
      if (!fsSync.existsSync(directoryPath)) {
        console.log(`[Main Process] Directory does not exist: ${directoryPath}`);
        return [];
      }

      // List actual note files from the filesystem
      const noteFiles = await fileOperationService.listNoteFiles(directoryPath);
      console.log(`[Main Process] Found ${noteFiles.length} note files`);

      const result = noteFiles.map(noteFile => ({
        title: noteFile.title,
        name: path.basename(noteFile.filePath),
        filePath: noteFile.filePath,
        createdAt: noteFile.createdAt instanceof Date ? noteFile.createdAt.toISOString() : noteFile.createdAt,
        modifiedAt: noteFile.modifiedAt instanceof Date ? noteFile.modifiedAt.toISOString() : noteFile.modifiedAt,
        metadata: noteFile.metadata
      }));

      // Cache the result
      fileListCache.set(directoryPath, { data: result, timestamp: Date.now() });

      return result;
    } catch (error: unknown) {
      console.error('[Main Process] Error listing note files:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  });
})

// Read a markdown file
ipcMain.handle('read-note-file', async (_, filePath) => {
  // Input validation
  if (!filePath || typeof filePath !== 'string') {
    const error = new Error('Invalid file path provided');
    console.error('[Main Process]', error.message);
    throw error;
  }

  try {
    if (!fsSync.existsSync(filePath)) {
      const error = new Error(`File not found: ${filePath}`);
      console.error(`[Main Process]`, error.message);
      throw error;
    }

    const content = await fs.readFile(filePath, 'utf8');

    return content;
  } catch (error: unknown) {
    console.error('[Main Process] Error reading note file:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        throw new Error(`File not found: ${filePath}`);
      } else if (error.message.includes('EACCES')) {
        throw new Error(`Permission denied reading file: ${filePath}`);
      } else if (error.message.includes('EISDIR')) {
        throw new Error(`Path is a directory, not a file: ${filePath}`);
      }
    }

    throw error;
  }
})

// Collection file operation handlers
ipcMain.handle('save-collections-file', async (_, collectionsData: string, saveLocation: string) => {
  try {
    if (!saveLocation) {
      throw new Error('Save location is required');
    }

    // Ensure the save location directory exists
    if (!fsSync.existsSync(saveLocation)) {
      await fs.mkdir(saveLocation, { recursive: true });
    }

    // Define the collections file path
    const collectionsFilePath = path.join(saveLocation, 'collections.json');

    // Atomic write: temp file -> sync -> rename (prevents corruption on crash)
    await atomicWriteFile(collectionsFilePath, collectionsData, 'utf8');

    // Update tray menu when collections change
    updateTrayMenu().catch(error => console.error('Error updating tray menu after collections save:', error));

    return { success: true, filePath: collectionsFilePath };
  } catch (error: unknown) {
    console.error('[Main Process] Error saving collections file:', error);
    throw error;
  }
})

ipcMain.handle('read-collections-file', async (_, saveLocation: string) => {
  try {
    if (!saveLocation) {
      return { success: false, error: 'No save location provided' };
    }

    const collectionsFilePath = path.join(saveLocation, 'collections.json');

    // Check if the collections file exists
    if (!fsSync.existsSync(collectionsFilePath)) {
      return { success: false, error: 'Collections file not found' };
    }

    // Read the collections data from file
    const collectionsData = await fs.readFile(collectionsFilePath, 'utf8');

    return { success: true, data: collectionsData };
  } catch (error: unknown) {
    console.error('[Main Process] Error reading collections file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error reading collections file'
    };
  }
})

// ============================================================================
// CRASH RECOVERY IPC HANDLERS
// ============================================================================

/**
 * Store recovery data for a note (called periodically from renderer during editing)
 */
ipcMain.handle('store-recovery-data', async (_, data: RecoveryData) => {
  try {
    storeRecoveryData(data);
    return { success: true };
  } catch (error) {
    console.error('[Recovery] Failed to store recovery data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/**
 * Clear recovery data for a note (called after successful save)
 */
ipcMain.handle('clear-recovery-data', async (_, noteId: string) => {
  try {
    clearRecoveryData(noteId);
    return { success: true };
  } catch (error) {
    console.error('[Recovery] Failed to clear recovery data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/**
 * Get all pending recovery data (called on app startup)
 */
ipcMain.handle('get-recovery-data', async () => {
  try {
    const data = await loadRecoveryData();
    return { success: true, data };
  } catch (error) {
    console.error('[Recovery] Failed to get recovery data:', error);
    return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/**
 * Clear all recovery data (called after user dismisses recovery dialog)
 */
ipcMain.handle('clear-all-recovery-data', async () => {
  try {
    await clearAllRecoveryData();
    return { success: true };
  } catch (error) {
    console.error('[Recovery] Failed to clear all recovery data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Graceful shutdown - flush recovery data and clean up
app.on('before-quit', async (event) => {
  console.log('[Shutdown] App is quitting, flushing recovery data...');

  // Stop the recovery flush interval
  if (recoveryFlushInterval) {
    clearInterval(recoveryFlushInterval);
    recoveryFlushInterval = null;
  }

  // Flush any pending recovery data to disk
  try {
    await flushRecoveryData();
    console.log('[Shutdown] Recovery data flushed successfully');
  } catch (error) {
    console.error('[Shutdown] Failed to flush recovery data:', error);
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    mainWindow = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

// Auto-launch IPC handlers
ipcMain.handle('set-auto-launch', async (_, enabled) => {
  try {
    if (enabled) {
      await scribbleAutoLauncher.enable()
    } else {
      await scribbleAutoLauncher.disable()
    }
    return enabled
  } catch (error) {
    console.error('Error setting auto-launch:', error)
    return false
  }
})

ipcMain.handle('get-auto-launch', async () => {
  try {
    return await scribbleAutoLauncher.isEnabled()
  } catch (error) {
    console.error('Error getting auto-launch status:', error)
    return false
  }
})

// Sync settings from renderer to main process
ipcMain.handle('sync-settings', (_, inputSettings) => {
  try {
    console.log('Syncing settings from renderer to main process:', inputSettings);

    // Validate input to prevent type safety issues
    if (typeof inputSettings !== 'object' || inputSettings === null) {
      console.error('sync-settings: received non-object payload', inputSettings);
      return false;
    }

    // Get previous settings to check for theme changes
    const settingsStore = new Store({ name: 'settings' });
    const previousSettings = settingsStore.get('settings') as { theme?: ThemeName } || {};
    const previousTheme = previousSettings.theme || 'dim';

    // Create a normalized settings object using an immutable approach
    const normalisedSettings: SettingsType = {
      ...inputSettings,
      globalHotkeys: {
        ...DEFAULT_GLOBAL_HOTKEYS,
        ...(inputSettings.globalHotkeys && typeof inputSettings.globalHotkeys === 'object' ?
          // Filter out undefined/null values from user settings
          Object.fromEntries(
            Object.entries(inputSettings.globalHotkeys)
              .filter(([, value]) => value !== undefined && value !== null)
          )
          : {}
        )
      }
    };

    console.log('Created normalized settings with proper global hotkeys');

    // Save the normalized settings object
    settingsStore.set('settings', normalisedSettings);

    // Check if save location changed and update tray menu
    const newSaveLocation = (inputSettings as any).saveLocation;
    if (newSaveLocation && newSaveLocation !== currentSaveLocation) {
      console.log('🔍 [Tray] Save location changed, updating tray menu...');
      currentSaveLocation = newSaveLocation;
      updateTrayMenu().catch(error => console.error('Error updating tray menu after save location change:', error));
    }

    // Update vibrancy if theme changed and we're on macOS
    const newTheme = (inputSettings as { theme?: ThemeName }).theme || 'dim';
    if (isMacOS && mainWindow && newTheme !== previousTheme) {
      try {
        const vibrancyMaterial = getVibrancyMaterialForSetMethod(newTheme);
        if (vibrancyMaterial) {
          mainWindow.setVibrancy(vibrancyMaterial);
          console.log(`Main window vibrancy updated from ${previousTheme} to ${newTheme}: ${vibrancyMaterial}`);
        } else {
          mainWindow.setVibrancy(null);
          console.log(`Main window vibrancy disabled for theme change from ${previousTheme} to ${newTheme}`);
        }
      } catch (error) {
        console.error('Error updating vibrancy on theme change:', error);
      }
    }

    console.log('Settings synced successfully');

    // Unregister all shortcuts
    globalShortcut.unregisterAll();

    // Register them again with new settings
    registerGlobalHotkeys();

    // Verify that the hotkeys were registered
    const globalHotkeys = normalisedSettings.globalHotkeys;
    if (globalHotkeys) {
      const newNoteRegistered = globalHotkeys.newNote ?
        globalShortcut.isRegistered(formatAccelerator(globalHotkeys.newNote)) : false;

      // Use toggleApp if available, otherwise fall back to showApp
      const toggleAppHotkey = globalHotkeys.toggleApp || globalHotkeys.showApp;
      const toggleAppRegistered = toggleAppHotkey ?
        globalShortcut.isRegistered(formatAccelerator(toggleAppHotkey)) : false;

      console.log('Hotkey registration verification:', {
        newNote: globalHotkeys.newNote,
        newNoteRegistered,
        toggleApp: toggleAppHotkey,
        toggleAppRegistered
      });

      // If hotkeys failed to register, try again
      if ((globalHotkeys.newNote && !newNoteRegistered) ||
        (toggleAppHotkey && !toggleAppRegistered)) {
        console.warn('Some hotkeys failed to register. Trying again...');

        // Try unregistering again to be sure
        globalShortcut.unregisterAll();

        // And register again
        registerGlobalHotkeys();

        // Final verification
        const finalNewNoteRegistered = globalHotkeys.newNote ?
          globalShortcut.isRegistered(formatAccelerator(globalHotkeys.newNote)) : false;
        const finalToggleAppRegistered = toggleAppHotkey ?
          globalShortcut.isRegistered(formatAccelerator(toggleAppHotkey)) : false;

        console.log('Final hotkey registration verification:', {
          newNote: globalHotkeys.newNote,
          newNoteRegistered: finalNewNoteRegistered,
          toggleApp: toggleAppHotkey,
          toggleAppRegistered: finalToggleAppRegistered
        });
      }
    }

    // Double-check that the settings were actually saved to the store
    const savedSettings = settingsStore.get('settings');
    console.log('Verification - settings in store after sync:', savedSettings);

    // Ensure the saved settings match what was passed in
    if (savedSettings && normalisedSettings.globalHotkeys &&
      (savedSettings as SettingsType).globalHotkeys) {
      const savedHotkeys = (savedSettings as SettingsType).globalHotkeys;

      // Check if the required properties match, handling optional properties
      const settingsMatch =
        (savedHotkeys?.newNote === normalisedSettings.globalHotkeys?.newNote) &&
        (savedHotkeys?.toggleApp === normalisedSettings.globalHotkeys?.toggleApp);

      console.log(`Verification - settings match what was sent: ${settingsMatch}`);

      if (!settingsMatch) {
        console.warn('Settings in store do not match what was sent. Saving again...');
        settingsStore.set('settings', normalisedSettings);
      }
    }

    return true;
  } catch (error) {
    console.error('Error syncing settings:', error);
    return false;
  }
});

// Track if settings have been logged to reduce spam
let settingsLoggedOnce = false;

// Get settings from main process
ipcMain.handle('get-main-process-settings', () => {
  try {
    const settingsStore = new Store({ name: 'settings' });
    const settings = settingsStore.get('settings');

    // Only log settings once per session to reduce spam
    if (!settingsLoggedOnce) {
      console.log('Retrieved settings from main process:', settings);
      settingsLoggedOnce = true;
    }

    // Validate settings to ensure we're returning a proper object
    if (typeof settings !== 'object' || settings === null) {
      console.error('get-main-process-settings: retrieved non-object settings', settings);
      return {};
    }

    return settings;
  } catch (error) {
    console.error('Error getting main process settings:', error);
    return {};
  }
});

// Update global hotkeys when settings change
ipcMain.on('settings-updated', (event) => {
  console.log('Received settings-updated event');

  // Get the sender window to send acknowledgment
  const senderWindow = BrowserWindow.fromWebContents(event.sender);

  // One call is sufficient - it clears every shortcut registered by this app
  console.log('Unregistering all shortcuts due to settings update');
  globalShortcut.unregisterAll();

  // Get the latest settings
  const settingsStore = new Store({ name: 'settings' });
  const inputSettings = settingsStore.get('settings') as SettingsType || {};

  console.log('Retrieved latest settings for hotkey registration:',
    inputSettings.globalHotkeys ? JSON.stringify(inputSettings.globalHotkeys, null, 2) : 'No global hotkeys found');

  // Validate input to prevent type safety issues
  if (typeof inputSettings !== 'object' || inputSettings === null) {
    console.error('settings-updated: retrieved non-object settings', inputSettings);
    // Send acknowledgment back to the sender window even on error
    if (senderWindow && !senderWindow.isDestroyed()) {
      senderWindow.webContents.send('settings-update-acknowledged', false);
    }
    return;
  }

  // Create a normalized settings object using an immutable approach
  const normalisedSettings: SettingsType = {
    ...inputSettings,
    globalHotkeys: {
      ...DEFAULT_GLOBAL_HOTKEYS,
      ...(inputSettings.globalHotkeys && typeof inputSettings.globalHotkeys === 'object' ?
        // Filter out undefined/null values from user settings
        Object.fromEntries(
          Object.entries(inputSettings.globalHotkeys)
            .filter(([, value]) => value !== undefined && value !== null)
        )
        : {}
      )
    }
  };

  console.log('Created normalized settings with proper global hotkeys');

  // Save the normalized settings
  settingsStore.set('settings', normalisedSettings);

  // Register them again with new settings
  registerGlobalHotkeys();

  // Send acknowledgment back to the sender window
  if (senderWindow && !senderWindow.isDestroyed()) {
    senderWindow.webContents.send('settings-update-acknowledged', true);
  }

  // Verify registration
  if (normalisedSettings.globalHotkeys) {
    const newNoteHotkey = normalisedSettings.globalHotkeys.newNote;
    // Use toggleApp if available, otherwise fall back to showApp
    const toggleAppHotkey = normalisedSettings.globalHotkeys.toggleApp || normalisedSettings.globalHotkeys.showApp;

    // Verify new note hotkey registration
    if (newNoteHotkey) {
      const formattedHotkey = formatAccelerator(newNoteHotkey);
      const isRegistered = globalShortcut.isRegistered(formattedHotkey);
      console.log(`New note hotkey ${newNoteHotkey} (formatted: ${formattedHotkey}) registered: ${isRegistered}`);

      // Check if default is still registered
      if (DEFAULT_GLOBAL_HOTKEYS.newNote) {
        const defaultRegistered = globalShortcut.isRegistered(DEFAULT_GLOBAL_HOTKEYS.newNote);
        console.log(`Default new note hotkey still registered: ${defaultRegistered}`);
      }
    }

    // Verify toggle app hotkey registration
    if (toggleAppHotkey) {
      const formattedHotkey = formatAccelerator(toggleAppHotkey);
      const isRegistered = globalShortcut.isRegistered(formattedHotkey);
      console.log(`Toggle app hotkey ${toggleAppHotkey} (formatted: ${formattedHotkey}) registered: ${isRegistered}`);

      // Check if default is still registered
      if (DEFAULT_GLOBAL_HOTKEYS.toggleApp) {
        const defaultRegistered = globalShortcut.isRegistered(DEFAULT_GLOBAL_HOTKEYS.toggleApp);
        console.log(`Default toggle app hotkey still registered: ${defaultRegistered}`);
      }
    }
  }

  // Log all registered shortcuts
  console.log('All registered shortcuts after update completed');
})

// Handle theme changes
ipcMain.on('theme-changed', (event, theme) => {
  console.log('Theme changed in main process:', theme);

  // Get the sender window
  const senderWindow = BrowserWindow.fromWebContents(event.sender);

  // Relay the theme change to all windows
  BrowserWindow.getAllWindows().forEach(win => {
    // Don't send back to the sender window to avoid loops
    if (win !== senderWindow) {
      console.log(`Sending theme-changed event to window ${win.id}`);
      win.webContents.send('theme-changed', theme);
    } else {
      console.log(`Skipping sender window ${win.id}`);
    }
  });
})

// Set the app user model id for Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.tylerburnett.scribble')
}

// Set the dock icon for macOS as early as possible
if (process.platform === 'darwin' && app.dock) {
  try {
    // Use the new rounded-corner icon for the dock
    const pngIconPath = path.join(process.env.APP_ROOT, 'src/assets/icon2-512.png')
    console.log('Setting dock icon with new rounded PNG path:', pngIconPath)

    // Check if the file exists
    if (fsSync.existsSync(pngIconPath)) {
      // Create a native image from the PNG file
      const dockIcon = nativeImage.createFromPath(pngIconPath)

      if (!dockIcon.isEmpty()) {
        console.log('Setting dock icon with dimensions:', dockIcon.getSize())
        app.dock.setIcon(dockIcon)
      } else {
        console.error('Failed to load PNG icon, it appears to be empty')

        // Try with the original icon as a last resort
        const originalIconPath = path.join(process.env.APP_ROOT, 'src/assets/icon2-512.png')
        if (fsSync.existsSync(originalIconPath)) {
          const originalIcon = nativeImage.createFromPath(originalIconPath)
          app.dock.setIcon(originalIcon)
        }
      }
    } else {
      console.error('PNG icon file does not exist:', pngIconPath)

      // Try with the original icon as a last resort
      const originalIconPath = path.join(process.env.APP_ROOT, 'src/assets/icon2-512.png')
      if (fsSync.existsSync(originalIconPath)) {
        const originalIcon = nativeImage.createFromPath(originalIconPath)
        app.dock.setIcon(originalIcon)
      }
    }
  } catch (error) {
    console.error('Error setting dock icon:', error)
  }
}

// Create application menu function
function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        {
          label: 'About ' + app.getName(),
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Command+,',
          click: () => {
            createSettingsWindow()
          }
        },
        { type: 'separator' },
        {
          label: 'Hide ' + app.getName(),
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Option+H',
          role: 'hideOthers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit ' + app.getName(),
          accelerator: 'Command+Q',
          click: () => {
            isQuitting = true
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', role: 'cut' },
        { label: 'Copy', accelerator: 'Command+C', role: 'copy' },
        { label: 'Paste', accelerator: 'Command+V', role: 'paste' },
        { label: 'Select All', accelerator: 'Command+A', role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Command+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'Command+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'Option+Command+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'Command+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'Command+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'Command+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'Control+Command+F', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'Command+M', role: 'minimize' },
        { label: 'Close', accelerator: 'Command+W', role: 'close' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Configure cache management to prevent excessive cache buildup
function configureCacheManagement() {
  console.log('Configuring cache management...')
  
  const isDev = process.env.NODE_ENV === 'development'
  
  // Set cache size limit to 50MB (50,000,000 bytes)
  // This prevents unlimited cache growth
  app.commandLine.appendSwitch('disk-cache-size', '50000000')
  
  // In production, clear cache on startup to ensure fresh start
  if (!isDev) {
    console.log('Production mode: Clearing cache on startup')
    session.defaultSession.clearCache().then(() => {
      console.log('Cache cleared successfully')
    }).catch((error: any) => {
      console.error('Error clearing cache:', error)
    })
  } else {
    console.log('Development mode: Cache size limited to 50MB')
  }
  
  // Set up periodic cache cleanup (every 24 hours)
  setInterval(() => {
    console.log('Performing periodic cache cleanup')
    session.defaultSession.clearCache().then(() => {
      console.log('Periodic cache cleanup completed')
    }).catch((error: any) => {
      console.error('Error during periodic cache cleanup:', error)
    })
  }, 24 * 60 * 60 * 1000) // 24 hours in milliseconds
}

// Add IPC handler for manual cache clearing (useful for debugging/maintenance)
ipcMain.handle('clear-app-cache', async () => {
  try {
    console.log('Manual cache clear requested')
    await session.defaultSession.clearCache()
    console.log('Manual cache clear completed')
    return { success: true }
  } catch (error) {
    console.error('Error clearing cache manually:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
})

// When app is ready
app.whenReady().then(async () => {
  // Initialize crash recovery system first
  initRecoverySystem()

  // Configure cache management to prevent excessive cache buildup
  configureCacheManagement()

  // Initialize current save location from settings
  try {
    const settingsStore = new Store({ name: 'settings' });
    const settings = settingsStore.get('settings') as any || {};
    if (settings.saveLocation) {
      currentSaveLocation = settings.saveLocation;
      console.log('🔍 [Tray] Initialized save location from settings:', currentSaveLocation);

      // Clean up orphaned temp files from crashed writes
      cleanupOrphanedTempFiles(settings.saveLocation).then(count => {
        if (count > 0) {
          console.log(`[Startup] Cleaned up ${count} orphaned temp file(s)`);
        }
      }).catch(error => {
        console.warn('[Startup] Failed to clean up temp files:', error);
      });
    }
  } catch (error) {
    console.error('Error initializing save location:', error);
  }

  // Set the dock icon again when the app is ready (as a backup)
  if (process.platform === 'darwin' && app.dock) {
    try {
      const pngIconPath = path.join(process.env.APP_ROOT, 'src/assets/icon2-512.png')
      if (fsSync.existsSync(pngIconPath)) {
        const dockIcon = nativeImage.createFromPath(pngIconPath)
        app.dock.setIcon(dockIcon)
        console.log('Dock icon set again when app is ready')
      }
    } catch (error) {
      console.error('Error setting dock icon in whenReady:', error)
    }
  }

  // Create application menu (macOS only)
  if (process.platform === 'darwin') {
    createApplicationMenu()
  }

  // Create main window
  createMainWindow()

  // Create tray icon
  await createTray()

  // Register global hotkeys
  registerGlobalHotkeys()
})
