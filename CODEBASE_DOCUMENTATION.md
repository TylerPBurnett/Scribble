# 📝 Scribble Codebase Documentation

## 🔍 Project Overview

**Scribble** is a modern, privacy-focused markdown note-taking application built as a cross-platform desktop app using Electron. It focuses on local data storage, rich markdown editing, and a clean, modern interface with multiple themes.

### Key Characteristics
- **Privacy-First**: All data stored locally, no cloud sync or data collection
- **Markdown-Based**: Full markdown support with rich text editing via TipTap
- **Multi-Window Architecture**: Separate windows for main app, individual notes, and settings
- **Cross-Platform**: Windows, macOS, and Linux support
- **Modern Tech Stack**: Electron + React + TypeScript + TipTap + Tailwind CSS

---

## 🏗️ Architecture Overview

### Multi-Window Electron Architecture
The application uses a sophisticated multi-window architecture:

1. **Main Window** (`src/main-window/`): Primary interface for note management and browsing
2. **Note Windows** (`src/note-window/`): Standalone editor windows for individual notes
3. **Settings Window** (`src/settings-window/`): Configuration and preferences

### Key Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **Desktop Framework**: Electron 30.x
- **Rich Text Editor**: TipTap 2.x with markdown extensions
- **Styling**: Tailwind CSS with custom theme system
- **State Management**: React hooks + local services
- **File Storage**: Local filesystem with electron-store for app settings
- **Build System**: Vite + electron-builder

---

## 📁 Project Structure

```
scribble/
├── electron/                     # Electron main process
│   ├── main.ts                  # Main electron process (1895 lines)
│   ├── preload.ts              # Preload scripts for renderer security
│   └── electron-env.d.ts       # Electron type definitions
├── src/                         # React application source
│   ├── main-window/             # Main application window
│   │   ├── MainApp.tsx         # Primary app component (464 lines)
│   │   └── components/         # Main window specific components
│   ├── note-window/             # Standalone note editor windows
│   │   ├── NoteApp.tsx         # Note editor app (158 lines)
│   │   └── components/         # Note window components
│   ├── settings-window/         # Settings/preferences window
│   ├── shared/                  # Shared resources between windows
│   │   ├── components/         # Reusable UI components
│   │   ├── services/           # Business logic services
│   │   ├── types/              # TypeScript type definitions
│   │   ├── styles/             # Theme system and styling
│   │   └── utils/              # Utility functions
│   └── components/ui/           # Base UI component library
├── public/                      # Static assets
├── screenshots/                 # App screenshots for documentation
└── test files/                  # Various test and debug scripts
```

---

## 🧩 Core Features & Implementation

### 1. Multi-Window Note Management
- **Main Window**: Displays note list, collections, search functionality
- **Note Windows**: Independent editor windows for focused writing
- **Window State Management**: Persists window positions and sizes
- **Inter-Window Communication**: IPC for data synchronization

### 2. Rich Markdown Editing (TipTap Integration)
**Extensions Used:**
- `@tiptap/starter-kit`: Core editing functionality
- `@tiptap/extension-task-list` & `@tiptap/extension-task-item`: Todo lists
- `@tiptap/extension-link`: Link management
- `@tiptap/extension-image`: Image embedding
- `@tiptap/extension-highlight`: Text highlighting
- `@tiptap/extension-typography`: Smart typography
- `@tiptap/extension-text-align`: Text alignment
- `@tiptap/extension-underline`: Underline formatting

### 3. File System Integration
**Note Storage:**
- Notes saved as `.md` files in user-specified directory
- Metadata stored separately for additional properties (color, pinned status, etc.)
- Support for Obsidian vault integration
- Auto-save functionality with configurable intervals

### 4. Theme System
**Three Built-in Themes:**
- **Light**: Clean, bright interface
- **Dark**: Full dark mode with proper contrast
- **Dim**: Reduced contrast dark theme

**Implementation:**
- CSS custom properties for theme variables
- Tailwind CSS integration via custom plugin
- macOS vibrancy effects support
- Real-time theme switching

### 5. Collections System
**Features:**
- User-created note collections/categories
- Dynamic note counting per collection
- Collection-based filtering and organization
- Session persistence for active collection

### 6. Global Hotkeys & Shortcuts
**System-Wide Hotkeys:**
- Quick note creation from anywhere
- App visibility toggle
- Customizable keyboard shortcuts

**In-App Shortcuts:**
- Markdown formatting shortcuts
- Navigation hotkeys
- Search functionality

---

## 🛠️ Technical Implementation Details

### Data Storage Architecture
```typescript
// Note Type Definition
interface Note {
  id: string;
  title: string;
  content: string;    // HTML content for editor
  createdAt: Date;
  updatedAt: Date;
}

// File Storage Strategy
- Notes: Individual .md files with markdown content
- Metadata: Separate JSON files for note properties
- Settings: electron-store for app configuration
- Window State: Persistent window positioning
```

### Service Layer Architecture
**Core Services:**
1. **`noteService.ts`** (342 lines): Note CRUD operations, file I/O
2. **`settingsService.ts`** (430 lines): App configuration management
3. **`collectionService.ts`** (801 lines): Collection management and organization
4. **`hotkeyService.ts`** (155 lines): Global shortcut management
5. **`themeService.ts`**: Theme switching and persistence

### Build & Distribution
**Development:**
```bash
npm run dev        # Start development server (Vite + Electron)
npm run build      # Build for production
npm run lint       # ESLint checking
```

**Distribution via electron-builder:**
- **Windows**: NSIS installer (.exe)
- **macOS**: DMG installer
- **Linux**: AppImage format
- Platform-specific optimizations and signing

### Security Model
- **Preload Scripts**: Secure IPC communication
- **Context Isolation**: Renderer process security
- **Node Integration**: Disabled in renderer for security
- **File System Access**: Controlled via main process APIs

---

## 🎨 UI/UX Design System

### Component Architecture
**Base Components** (`src/components/ui/`):
- `button.tsx`: Customizable button component
- `dialog.tsx`: Modal dialog system
- `form.tsx`: Form handling utilities
- `input.tsx`: Input field components
- `label.tsx`: Form labels
- `switch.tsx`: Toggle switch component

**Styling Strategy:**
- **Tailwind CSS**: Utility-first CSS framework
- **Custom CSS Properties**: Theme system implementation
- **Component Variants**: class-variance-authority for component variations
- **Responsive Design**: Mobile-first approach with breakpoints

### Color System
```css
/* Theme Variables */
--primary: hsl(45, 93%, 47%)           /* Amber primary color */
--background: theme-dependent
--background-notes: specialized note backgrounds
--background-titlebar: title bar styling
--border: consistent border colors
--foreground: text colors
```

**Note Colors:**
- Slate, Sky, Emerald, Amber, Rose, Violet
- Color-coded organization system

---

## 🔧 Configuration Files

### Build Configuration
- **`vite.config.ts`**: Development server and build configuration
- **`electron-builder.json5`**: Distribution packaging settings
- **`tsconfig.json`**: TypeScript compiler configuration
- **`tailwind.config.js`**: Tailwind CSS customization

### Dependencies Overview
**Core Dependencies:**
- React ecosystem: `react`, `react-dom`, `react-hook-form`
- Electron: `electron`, `@electron/remote`, `electron-store`
- Editor: TipTap extensions suite
- UI: Radix UI components, Lucide React icons
- Styling: Tailwind CSS ecosystem
- Utilities: `uuid`, `turndown`, `zod`, `clsx`

---

## 🔄 Data Flow & State Management

### Application State Flow
1. **Initialization**: Settings load → Theme application → Note discovery
2. **Note Management**: File system operations → State updates → UI refresh
3. **Cross-Window Sync**: IPC messages → State synchronization
4. **Auto-save**: Content changes → Debounced saves → File system

### IPC Communication Patterns
```typescript
// Main Process APIs exposed to renderer
window.fileOps.readNoteFile(path)
window.fileOps.writeNoteFile(path, content)
window.fileOps.listNoteFiles(directory)
window.noteWindow.onInitialNoteData(callback)
window.settings.get(key)
window.settings.set(key, value)
```

---

## 🚀 Development Status & Roadmap

### Current Version: 0.0.1
**Status**: Active development focusing on UI polish and core functionality

### Recent Development Focus
- Multi-window architecture refinement
- Collection system implementation
- Theme system improvements
- Performance optimizations
- Bug fixes and stability improvements

### Key Development Areas
1. **UI Foundation**: Theme consistency, component standardization
2. **Core Experience**: Editor improvements, note organization
3. **Performance**: Startup optimization, large note handling
4. **Platform Features**: System integration, file associations

---

## 🧪 Testing & Quality Assurance

### Test Files Present
The repository contains numerous test files for specific functionality:
- Collection system testing
- Hotkey functionality verification
- Nested list handling
- Enhanced formatting features
- Navigation and UI components

### Development Tools
- **ESLint**: Code quality and consistency
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast development and building
- **Electron DevTools**: Debugging and profiling

---

## 📦 Distribution & Deployment

### Build Artifacts
- **Output Directory**: `release/${version}/`
- **Platform Naming**: `${productName}-${Platform}-${version}-${Type}.${ext}`
- **App ID**: `com.tylerburnett.scribble`

### Installation Options
- **Windows**: NSIS installer with user customization
- **macOS**: DMG with drag-to-Applications
- **Linux**: AppImage for universal compatibility

---

## 🔐 Privacy & Security Features

### Local-First Architecture
- **No Cloud Dependency**: All data remains on user's device
- **No Telemetry**: No usage tracking or data collection
- **User Control**: Complete ownership of notes and settings

### File System Security
- **Sandboxed Access**: Controlled file operations
- **User Permission**: Explicit directory selection
- **Safe Defaults**: Secure default configurations

---

This documentation provides a comprehensive overview of the Scribble codebase architecture, implementation details, and development approach. The application represents a modern, privacy-focused approach to note-taking with a sophisticated multi-window desktop architecture.