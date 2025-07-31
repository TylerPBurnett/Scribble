import { app, BrowserWindow, ipcMain, dialog, screen, Tray, Menu, globalShortcut, nativeImage } from 'electron'
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

// Global map to store noteId -> filePath
const noteFileRegistry = new Map<string, string>();

// Global map to store transient new note data
const transientNewNotes = new Map<string, Note>();

// Define the metadata interface
interface NoteMetadata {
  id?: string;
  color?: string;
  pinned?: boolean;
  favorite?: boolean;
  transparency?: number;
  [key: string]: unknown;
}

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
  console.log('Window creation - Vibrancy material:', vibrancyMaterial);
  console.log('Window creation - Is macOS:', isMacOS);
  
  const vibrancyConfig = {
    transparent: true,
    ...(isMacOS && vibrancyMaterial ? {
      vibrancy: vibrancyMaterial,
      backgroundMaterial: 'under-window',
    } : {})
  };
  
  console.log('Window creation - Final vibrancy config:', vibrancyConfig);

  // Create the browser window with saved state or defaults
  mainWindow = new BrowserWindow({
    width: mainWindowState.width,
    height: mainWindowState.height,
    x: validPosition ? mainWindowState.x : undefined,
    y: validPosition ? mainWindowState.y : undefined,
    minWidth: 250,
    minHeight: 300,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    // Use the new rounded-corner icon
    icon: path.join(process.env.APP_ROOT, 'src/assets/icon2-512.png'),
    title: 'Scribble',
    frame: false,
    // On macOS, use 'hiddenInset' to show the native traffic lights
    // On Windows, use 'hidden' to completely hide the title bar
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    // Additional macOS-specific settings
    trafficLightPosition: { x: 20, y: 20 },
    // Apply vibrancy configuration on macOS
    ...vibrancyConfig,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Maximize window if it was maximized before
  if (mainWindowState.isMaximized) {
    mainWindow.maximize();
  }

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
    // Remove backgroundColor for transparency
    // backgroundColor: '#1a1a1a',
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
    // opacity: 1, // Remove opacity control, let CSS handle it
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

  // Send initial note data once the window is ready
  noteWindow.once('ready-to-show', () => {
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

    // Clean up any transient data for this note
    if (transientNewNotes.has(noteId)) {
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
    // Additional macOS-specific settings
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Load the settings.html file instead of index.html
  let url;
  if (VITE_DEV_SERVER_URL) {
    // In development mode, we need to handle the URL carefully
    const baseUrl = VITE_DEV_SERVER_URL.endsWith('/') ?
      VITE_DEV_SERVER_URL :
      `${VITE_DEV_SERVER_URL}/`;
    url = `${baseUrl}settings.html`;
  } else {
    // In production mode, we load the file directly
    url = path.join(RENDERER_DIST, 'settings.html');
  }

  console.log('Loading URL for settings window:', url)

  if (VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(url)
  } else {
    settingsWindow.loadFile(url)
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

// Create tray icon
function createTray() {
  // Create tray icon
  const iconPath = path.join(process.env.APP_ROOT, 'src/assets/icon-64.png')
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  tray = new Tray(trayIcon)

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
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
        // Generate a unique UUID for the new note
        const noteId = uuidv4();
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
  ])

  // Set tray properties
  tray.setToolTip('Scribble')
  tray.setContextMenu(contextMenu)

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
}

// Default global hotkeys - use non-optional types here since these are guaranteed to exist
const DEFAULT_GLOBAL_HOTKEYS: Readonly<Record<string, string>> = {
  newNote  : 'CommandOrControl+Alt+N',
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
    () => {
      // Generate a unique UUID for the new note
      const noteId = uuidv4();
      console.log('[Main Process] Global hotkey: create-note called, generated UUID:', noteId);

      // Create a new note object and store it in transient registry
      const newNote: Note = {
        id: noteId,
        title: 'Untitled Note',
        content: '<p></p>',
        createdAt: new Date(),
        updatedAt: new Date(),
        _isNew: true
      };

      console.log('[Main Process] Global hotkey: Generated new note object:', newNote);

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

  // Check if our hotkeys are registered
  if (newNoteHotkey && newNoteRegistered) {
    const formattedHotkey = formatAccelerator(newNoteHotkey);
    allRegisteredShortcuts.push(formattedHotkey);
  }

  if (toggleAppHotkey && toggleAppRegistered) {
    const formattedHotkey = formatAccelerator(toggleAppHotkey);
    allRegisteredShortcuts.push(formattedHotkey);
  }

  // Also check default hotkeys
  if (DEFAULT_GLOBAL_HOTKEYS.newNote && globalShortcut.isRegistered(DEFAULT_GLOBAL_HOTKEYS.newNote)) {
    allRegisteredShortcuts.push(DEFAULT_GLOBAL_HOTKEYS.newNote);
  }

  if (DEFAULT_GLOBAL_HOTKEYS.toggleApp && globalShortcut.isRegistered(DEFAULT_GLOBAL_HOTKEYS.toggleApp)) {
    allRegisteredShortcuts.push(DEFAULT_GLOBAL_HOTKEYS.toggleApp);
  }

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

// Helper function to create a safe filename from a title
function getSafeFileName(title: string, noteId: string): string {
  // Sanitize the title (replace invalid chars with underscores, limit length)
  const sanitizedTitle = title && title.trim()
    ? title.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50)
    : 'untitled_note';

  // Append the noteId (or a portion of it) to ensure uniqueness
  return `${sanitizedTitle}_${noteId.substring(0, 8)}.md`;
}

// Helper function to parse metadata from file content
function parseMetadataFromFileContent(content: string): { metadata: NoteMetadata, content: string } {
  // Look for metadata in HTML comment at the end of the file
  // Format: <!-- scribble-metadata: {"color":"#fff9c4","pinned":true} -->
  const metadataRegex = /<!-- scribble-metadata: (.*?) -->\s*$/;
  const match = content.match(metadataRegex);

  if (!match) {
    return { metadata: {}, content };
  }

  try {
    // Parse the JSON metadata
    const metadataJson = match[1];
    const metadata = JSON.parse(metadataJson) as NoteMetadata;

    // Remove the metadata comment from content
    const contentWithoutMetadata = content.replace(metadataRegex, '');

    return {
      metadata,
      content: contentWithoutMetadata
    };
  } catch (error) {
    console.error('Error parsing metadata JSON in main process:', error);
    return { metadata: {}, content };
  }
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
ipcMain.on('theme-changed', (event, newTheme: ThemeName) => {
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

ipcMain.handle('create-note', async () => {
  // Generate a unique UUID for the new note
  const noteId = uuidv4();
  console.log('[Main Process] IPC: create-note called, generated UUID:', noteId);

  // Create a new note object
  const newNote: Note = {
    id: noteId,
    title: 'Untitled Note',
    content: '<p></p>',
    createdAt: new Date(),
    updatedAt: new Date(),
    _isNew: true
  };

  console.log('[Main Process] Generated new note object:', newNote);

  // Store the note in the transient registry
  transientNewNotes.set(noteId, newNote);

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
    console.log(`[Main Process] Serving transient data for new note ID: ${noteId}`);
    return note;
  }
  console.warn(`[Main Process] No transient new note data found for ID: ${noteId}`);
  return null;
})

// Settings IPC handlers
ipcMain.handle('open-settings', () => {
  createSettingsWindow()
  return { success: true }
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
ipcMain.handle('save-note-to-file', async (_, noteId: string, title: string, content: string, saveLocation: string, isFirstSave: unknown) => {
  console.log('[Main Process] Saving note to file:', { noteId, title, saveLocation, isFirstSave });
  try {
    // Ensure the directory exists
    if (!fsSync.existsSync(saveLocation)) {
      await fs.mkdir(saveLocation, { recursive: true });
    }

    // Convert isFirstSave to boolean (handling the type mismatch from preload)
    const isNewNote = isFirstSave === true || isFirstSave === 'true';
    console.log(`[Main Process] Is this a new note? ${isNewNote}`);

    // Get the current file path from the registry
    const currentFilePath = noteFileRegistry.get(noteId);
    console.log(`[Main Process] Current file path from registry: ${currentFilePath || 'Not found'}`);

    // Generate a new filename based on the title and noteId
    const newFileName = getSafeFileName(title, noteId);
    const newFilePath = path.join(saveLocation, newFileName);
    console.log(`[Main Process] New file path: ${newFilePath}`);

    if (isNewNote) {
      // This is a brand new note or a "Untitled Note" being saved for the first time
      console.log(`[Main Process] Creating new note file: ${newFilePath} for ID: ${noteId}`);
      await fs.writeFile(newFilePath, content);

      // Update the registry with the new file path
      noteFileRegistry.set(noteId, newFilePath);

      return { success: true, filePath: newFilePath, newNoteId: noteId };
    } else {
      // Existing note logic (update or rename)
      let finalFilePath = currentFilePath;

      // If we have a current file path and the filename needs to change
      if (currentFilePath && path.basename(currentFilePath) !== newFileName && path.dirname(currentFilePath) === saveLocation) {
        console.log(`[Main Process] Title changed, need to rename file from ${path.basename(currentFilePath)} to ${newFileName}`);

        try {
          // Check if the target file already exists (could happen with duplicate titles)
          const newFileExists = await fs.stat(newFilePath).catch(() => null);

          if (newFileExists) {
            console.warn(`[Main Process] Target file ${newFilePath} already exists. Overwriting current file instead of renaming.`);
            // We'll proceed to write to the new path, effectively overwriting if it's the same ID
          } else {
            // Rename the file
            await fs.rename(currentFilePath, newFilePath);
            console.log(`[Main Process] Renamed note file from ${currentFilePath} to ${newFilePath}`);
          }

          // Update the final path and registry
          finalFilePath = newFilePath;
          noteFileRegistry.set(noteId, newFilePath);
        } catch (renameErr) {
          console.error('[Main Process] Error renaming file:', renameErr);
          // If rename fails, we'll try to write to the new path directly
          finalFilePath = newFilePath;
        }
      } else if (!currentFilePath) {
        // This case handles notes that might have been created before the UUID system,
        // or if the registry somehow got reset/lost for an existing note
        console.log(`[Main Process] No existing file found in registry for ID ${noteId}. Searching directory...`);

        try {
          // Try to find the file by looking for files that might contain the noteId
          const files = await fs.readdir(saveLocation);
          const possibleOldFile = files.find(f => f.includes(noteId));

          if (possibleOldFile) {
            const oldPath = path.join(saveLocation, possibleOldFile);
            console.log(`[Main Process] Found possible matching file: ${oldPath}`);

            if (path.basename(oldPath) !== newFileName) {
              // Rename the file if the name needs to change
              await fs.rename(oldPath, newFilePath);
              console.log(`[Main Process] Renamed fallback note file from ${oldPath} to ${newFilePath}`);
              finalFilePath = newFilePath;
            } else {
              // File name hasn't changed, just update content
              finalFilePath = oldPath;
            }
          } else {
            console.warn(`[Main Process] No existing file found on disk for ID ${noteId}. Creating new file.`);
            // This might happen if a note was opened/edited but then its file was manually deleted
            finalFilePath = newFilePath;
          }
        } catch (searchErr) {
          console.error('[Main Process] Error searching for existing file:', searchErr);
          finalFilePath = newFilePath;
        }
      } else {
        // The file exists and the name hasn't changed, or it's in a different directory
        console.log(`[Main Process] Using existing file path: ${currentFilePath}`);
        finalFilePath = currentFilePath;
      }

      // Write the updated content to the final file path
      console.log(`[Main Process] Writing content to: ${finalFilePath}`);
      await fs.writeFile(finalFilePath || newFilePath, content);

      // Update the registry with the final path
      noteFileRegistry.set(noteId, finalFilePath || newFilePath);

      return {
        success: true,
        filePath: finalFilePath || newFilePath,
        newNoteId: noteId
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Main Process] Error saving note to file:', error);
    return { success: false, error: errorMessage };
  }
})

ipcMain.handle('delete-note-file', async (_, noteId: string, _title: string, saveLocation: string) => {
  console.log('[Main Process] Deleting note file:', { noteId, saveLocation });
  try {
    // Get the file path from the registry
    const filePathToDelete = noteFileRegistry.get(noteId);
    console.log(`[Main Process] File path from registry: ${filePathToDelete || 'Not found'}`);

    if (!filePathToDelete) {
      console.warn(`[Main Process] Attempted to delete note (ID: ${noteId}) but no file path found in registry.`);

      // Fallback: search the directory for files that might match the ID
      try {
        const files = await fs.readdir(saveLocation);
        const possibleFile = files.find(file => file.includes(noteId));

        if (possibleFile) {
          const fullPath = path.join(saveLocation, possibleFile);
          console.log(`[Main Process] Found possible matching file: ${fullPath}`);

          // Delete the file
          await fs.unlink(fullPath);
          console.log(`[Main Process] Fallback deleted note file: ${fullPath} for ID: ${noteId}`);

          // Remove from registry if it was somehow there with a different path
          noteFileRegistry.delete(noteId);

          return { success: true };
        }

        return { success: false, error: `File for note ID ${noteId} not found in directory.` };
      } catch (searchErr) {
        console.error('[Main Process] Error searching for file to delete:', searchErr);
        return { success: false, error: `Error searching for file: ${searchErr instanceof Error ? searchErr.message : 'Unknown error'}` };
      }
    }

    // Delete the file
    await fs.unlink(filePathToDelete);
    console.log(`[Main Process] Deleted note file: ${filePathToDelete} for ID: ${noteId}`);

    // Remove from registry
    noteFileRegistry.delete(noteId);

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Main Process] Error deleting note file:', error);
    return { success: false, error: errorMessage };
  }
})

// List all markdown files in a directory
ipcMain.handle('list-note-files', async (_, directoryPath) => {
  console.log(`[Main Process] Listing note files in directory: ${directoryPath}`);
  try {
    if (!fsSync.existsSync(directoryPath)) {
      console.log(`[Main Process] Directory does not exist: ${directoryPath}`);
      return [];
    }

    const files = await fs.readdir(directoryPath);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    console.log(`[Main Process] Found ${markdownFiles.length} markdown files`);

    // Clear the registry before repopulating it
    noteFileRegistry.clear();

    const noteFiles = [];
    for (const fileName of markdownFiles) {
      try {
        const filePath = path.join(directoryPath, fileName);
        const stats = await fs.stat(filePath);

        // Default ID from filename (fallback)
        let fileId = fileName.replace(/\.md$/, '');
        let parsedMetadata = {};

        try {
          // Read the file content to extract metadata
          const fileContent = await fs.readFile(filePath, 'utf8');
          const { metadata } = parseMetadataFromFileContent(fileContent);

          // If we have an embedded ID in the metadata, use that instead
          if (metadata.id) {
            fileId = metadata.id as string;
            console.log(`[Main Process] Using embedded ID from metadata: ${fileId} for file: ${fileName}`);
          } else {
            console.log(`[Main Process] No embedded ID found, using filename-derived ID: ${fileId} for file: ${fileName}`);
          }

          parsedMetadata = metadata;
        } catch (readError) {
          console.warn(`[Main Process] Could not read or parse metadata from ${filePath}:`, readError);
          // Continue with filename as ID if metadata parsing fails
        }

        // Add to the registry
        noteFileRegistry.set(fileId, filePath);

        // Add to the result list
        noteFiles.push({
          id: fileId,
          name: fileName,
          path: filePath,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          // Include metadata for easier access in noteService
          metadata: parsedMetadata
        });
      } catch (fileError) {
        console.error(`[Main Process] Error processing file ${fileName}:`, fileError);
        // Skip this file and continue with others
      }
    }

    console.log(`[Main Process] Processed ${noteFiles.length} note files. Registry size: ${noteFileRegistry.size}`);
    return noteFiles;
  } catch (error: unknown) {
    console.error('[Main Process] Error listing note files:', error);
    return [];
  }
})

// Read a markdown file
ipcMain.handle('read-note-file', async (_, filePath) => {
  console.log(`[Main Process] Reading note file: ${filePath}`);
  try {
    if (!fsSync.existsSync(filePath)) {
      console.error(`[Main Process] File not found: ${filePath}`);
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await fs.readFile(filePath, 'utf8');

    // Parse the content to extract metadata
    const { metadata } = parseMetadataFromFileContent(content);

    // If the metadata contains an ID, make sure it's in the registry
    if (metadata.id) {
      const noteId = metadata.id as string;

      // Update the registry if needed
      if (!noteFileRegistry.has(noteId) || noteFileRegistry.get(noteId) !== filePath) {
        console.log(`[Main Process] Updating registry for ID ${noteId} with path ${filePath}`);
        noteFileRegistry.set(noteId, filePath);
      }
    }

    return content;
  } catch (error: unknown) {
    console.error('[Main Process] Error reading note file:', error);
    throw error;
  }
})

// Collection file operation handlers
ipcMain.handle('save-collections-file', async (_, collectionsData: string, saveLocation: string) => {
  console.log('[Main Process] Saving collections to file:', { saveLocation });
  try {
    if (!saveLocation) {
      throw new Error('Save location is required');
    }

    // Ensure the save location directory exists
    if (!fsSync.existsSync(saveLocation)) {
      console.log(`[Main Process] Creating save location directory: ${saveLocation}`);
      await fs.mkdir(saveLocation, { recursive: true });
    }

    // Define the collections file path
    const collectionsFilePath = path.join(saveLocation, 'collections.json');
    
    console.log(`[Main Process] Writing collections to: ${collectionsFilePath}`);
    
    // Write the collections data to file
    await fs.writeFile(collectionsFilePath, collectionsData, 'utf8');
    
    console.log('[Main Process] Collections file saved successfully');
    return { success: true, filePath: collectionsFilePath };
  } catch (error: unknown) {
    console.error('[Main Process] Error saving collections file:', error);
    throw error;
  }
})

ipcMain.handle('read-collections-file', async (_, saveLocation: string) => {
  console.log('[Main Process] Reading collections from file:', { saveLocation });
  try {
    if (!saveLocation) {
      console.log('[Main Process] No save location provided');
      return null;
    }

    const collectionsFilePath = path.join(saveLocation, 'collections.json');
    
    // Check if the collections file exists
    if (!fsSync.existsSync(collectionsFilePath)) {
      console.log(`[Main Process] Collections file not found: ${collectionsFilePath}`);
      return null;
    }

    console.log(`[Main Process] Reading collections from: ${collectionsFilePath}`);
    
    // Read the collections data from file
    const collectionsData = await fs.readFile(collectionsFilePath, 'utf8');
    
    console.log('[Main Process] Collections file read successfully');
    return collectionsData;
  } catch (error: unknown) {
    console.error('[Main Process] Error reading collections file:', error);
    throw error;
  }
})

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

// Get settings from main process
ipcMain.handle('get-main-process-settings', () => {
  try {
    const settingsStore = new Store({ name: 'settings' });
    const settings = settingsStore.get('settings');
    console.log('Retrieved settings from main process:', settings);

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

// When app is ready
app.whenReady().then(() => {
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

  // Create main window
  createMainWindow()

  // Create tray icon
  createTray()

  // Register global hotkeys
  registerGlobalHotkeys()
})
