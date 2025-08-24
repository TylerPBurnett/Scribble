# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- Do not use 'bun run dev' unless the user asks for it, the use will handle all server starts
- `bun run dev` - Start development server on port 5173
- `bun run build` - Build and package the Electron app
- `bun run preview` - Preview the build locally

### Testing
- `bun test` - Run tests in watch mode with Vitest
- `bun run test:run` - Run all tests once
- `bun run test:ui` - Launch Vitest UI for interactive testing

### Code Quality
- `bun run lint` - Run ESLint with TypeScript support

## Project Architecture

### Application Structure
Scribble is an Electron-based note-taking application with a multi-window architecture:

- **Main Window** (`src/main-window/`): Note management interface with collections, search, and note list
- **Note Window** (`src/note-window/`): Individual note editing windows with TipTap rich text editor
- **Settings Window** (`src/settings-window/`): Application configuration and preferences

### Key Technical Details

#### Multi-Window System
- Each window has its own React app entry point (index.html, note.html, settings.html)
- Windows communicate through Electron IPC and shared services
- Main process (`electron/main.ts`) manages window lifecycle and system integration

#### File System Architecture
- Notes are stored as markdown files in user-configurable directory
- File operations handled through `fileOperationService.ts` with IPC calls to main process
- Settings stored using `electron-store` for persistence across sessions

#### State Management
- No centralized state management (Redux/Zustand)
- Each window manages its own React state
- Services provide shared business logic and data access
- Settings synchronized across windows through `settingsService.ts`

#### Rich Text Editing
- Uses TipTap editor (`src/note-window/components/Tiptap.tsx`) with markdown support
- Custom extensions for enhanced list handling and markdown shortcuts
- Auto-save functionality with configurable intervals

#### Theming System
- Theme management in `src/shared/services/themeService.ts`
- Supports light, dark, dim, and lightv2 themes
- macOS vibrancy effects based on theme selection
- CSS custom properties for theme variables

#### Collections System
- Notes organized into collections (folders)
- Collection state managed in `src/shared/services/collectionService.ts`
- Persistent collection selection across sessions

### Service Layer
Core services in `src/shared/services/`:
- `noteService.ts` - CRUD operations for notes
- `fileOperationService.ts` - File system interactions via IPC
- `settingsService.ts` - Application settings management
- `collectionService.ts` - Note organization and filtering
- `hotkeyService.ts` - Global and local keyboard shortcuts
- `themeService.ts` - Theme switching and persistence

### Testing Setup
- Vitest with React Testing Library
- Happy-DOM environment for fast DOM simulation
- Test files use `.test.tsx/.test.ts` extension
- Setup file: `src/test/setup.ts`

### Build Configuration
- Vite for development and bundling
- Electron Builder for packaging
- TypeScript with strict mode enabled
- Tailwind CSS for styling with custom theme plugin

### Performance Monitoring
- Performance dashboard component for monitoring render times
- Performance utilities in `src/shared/utils/` for measurement and validation
- Integration tests for performance regression detection