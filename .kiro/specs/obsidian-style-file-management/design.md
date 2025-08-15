# Design Document

## Overview

This design transforms the current complex note file management system into a simplified, Obsidian-style approach where filenames directly represent note titles. The new system eliminates the need for a file registry, reduces complexity, and improves reliability while maintaining backward compatibility.

## Architecture

### Current System Issues
- Complex UUID-based filename generation (`title_uuid.md`)
- Dual storage of titles (filename + metadata)
- File registry mapping note IDs to file paths
- Complex renaming logic with multiple failure points
- Inconsistent state between UI and file system

### New System Design
- Direct filename-to-title mapping
- Simplified file operations
- Elimination of file registry
- Atomic rename operations
- Single source of truth for note titles

## Components and Interfaces

### 1. File Naming Service

**Purpose:** Handle filename generation and sanitization

```typescript
interface FileNamingService {
  // Generate safe filename from title
  generateFilename(title: string): string;
  
  // Extract title from filename
  extractTitle(filename: string): string;
  
  // Handle filename conflicts
  resolveConflict(baseFilename: string, existingFiles: string[]): string;
  
  // Validate filename safety
  isValidFilename(filename: string): boolean;
}
```

**Implementation Details:**
- Use title directly as filename with `.md` extension
- Sanitize invalid filesystem characters: `< > : " | ? * \ /`
- Replace with safe alternatives or remove
- Preserve Unicode characters for international support
- Handle length limits (255 characters on most systems)
- Conflict resolution: append ` (2)`, ` (3)`, etc.

### 2. File Operation Service

**Purpose:** Handle atomic file operations with proper error handling

```typescript
interface FileOperationService {
  // Create new note file
  createNoteFile(title: string, content: string, directory: string): Promise<FileOperationResult>;
  
  // Rename note file (title change)
  renameNoteFile(oldPath: string, newTitle: string): Promise<FileOperationResult>;
  
  // Update note content
  updateNoteFile(filePath: string, content: string): Promise<FileOperationResult>;
  
  // Delete note file
  deleteNoteFile(filePath: string): Promise<FileOperationResult>;
  
  // List all note files
  listNoteFiles(directory: string): Promise<NoteFileInfo[]>;
}

interface FileOperationResult {
  success: boolean;
  filePath?: string;
  error?: string;
  conflictResolution?: string;
}

interface NoteFileInfo {
  title: string;
  filePath: string;
  createdAt: Date;
  modifiedAt: Date;
  metadata: NoteMetadata;
}
```

### 3. Migration Service

**Purpose:** Migrate existing notes from UUID-based to title-based naming

```typescript
interface MigrationService {
  // Check if migration is needed
  needsMigration(directory: string): Promise<boolean>;
  
  // Perform migration
  migrateNotes(directory: string): Promise<MigrationResult>;
  
  // Backup existing notes before migration
  createBackup(directory: string): Promise<string>;
}

interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  backupPath?: string;
  errors: string[];
}
```

### 4. Updated Note Service

**Purpose:** Simplified note management without file registry

```typescript
interface NoteService {
  // Load notes from directory (no registry needed)
  loadNotes(directory: string): Promise<Note[]>;
  
  // Save note (handles creation and updates)
  saveNote(note: Note, directory: string): Promise<Note>;
  
  // Delete note
  deleteNote(noteTitle: string, directory: string): Promise<void>;
  
  // Get note by title
  getNoteByTitle(title: string, directory: string): Promise<Note | null>;
}
```

## Data Models

### Simplified Note Model

```typescript
interface Note {
  title: string;           // Primary identifier (derived from filename)
  content: string;         // Note content in HTML
  createdAt: Date;
  updatedAt: Date;
  
  // Optional metadata
  color?: string;
  pinned?: boolean;
  favorite?: boolean;
  transparency?: number;
  
  // Transient flags (not saved to file)
  _isNew?: boolean;
  _unsaved?: boolean;
}
```

### File Metadata Format

Metadata will be stored as HTML comments at the end of files:

```markdown
# Note Content Here

Some note content...

<!-- scribble-metadata: {"color":"#fff9c4","pinned":true,"favorite":false,"transparency":1} -->
```

**Key Changes:**
- Remove `id` from metadata (title is the identifier)
- Keep only visual/behavioral metadata
- Title is never stored in metadata (filename is source of truth)

## Error Handling

### File Operation Errors

1. **Permission Denied**
   - Show user-friendly error message
   - Suggest running as administrator or checking permissions
   - Provide retry option

2. **Filename Conflicts**
   - Automatically append number suffix
   - Show user the resolved filename
   - Allow user to choose different name

3. **Invalid Characters**
   - Automatically sanitize filename
   - Show user the sanitized version
   - Allow user to modify if desired

4. **File System Full**
   - Show clear error message
   - Suggest freeing disk space
   - Prevent data loss

5. **File Locked/In Use**
   - Retry with exponential backoff
   - Show progress indicator
   - Allow user to cancel

### Migration Errors

1. **Backup Creation Failure**
   - Abort migration
   - Show error message
   - Suggest manual backup

2. **Individual File Migration Failure**
   - Continue with other files
   - Log failed files
   - Show summary at end

3. **Metadata Parsing Errors**
   - Use default metadata values
   - Preserve original file as backup
   - Log parsing errors

## Testing Strategy

### Unit Tests

1. **File Naming Service**
   - Test filename sanitization
   - Test conflict resolution
   - Test Unicode handling
   - Test length limits

2. **File Operation Service**
   - Test atomic operations
   - Test error conditions
   - Test concurrent access
   - Test rollback scenarios

3. **Migration Service**
   - Test migration logic
   - Test backup creation
   - Test error recovery
   - Test partial migration scenarios

### Integration Tests

1. **End-to-End Note Operations**
   - Create, read, update, delete notes
   - Test title changes
   - Test concurrent operations
   - Test external file modifications

2. **Migration Testing**
   - Test with various existing note formats
   - Test with large numbers of notes
   - Test with problematic filenames
   - Test rollback scenarios

### Performance Tests

1. **Large Directory Handling**
   - Test with 1000+ notes
   - Measure load times
   - Test search performance
   - Test file watching impact

2. **Concurrent Operations**
   - Test multiple simultaneous saves
   - Test rename conflicts
   - Test file locking behavior

## Implementation Plan

### Phase 1: Core Services
- Implement FileNamingService
- Implement FileOperationService
- Add comprehensive error handling
- Create unit tests

### Phase 2: Migration System
- Implement MigrationService
- Create backup functionality
- Add migration UI
- Test with existing notes

### Phase 3: Integration
- Update NoteService to use new system
- Remove file registry code
- Update UI components
- Add user notifications

### Phase 4: Polish
- Optimize performance
- Add file watching
- Improve error messages
- Add recovery tools

## Security Considerations

1. **Path Traversal Prevention**
   - Validate all file paths
   - Prevent directory traversal attacks
   - Sanitize user input

2. **File Permission Handling**
   - Check permissions before operations
   - Handle permission changes gracefully
   - Provide clear error messages

3. **Backup Security**
   - Store backups securely
   - Clean up old backups
   - Prevent backup corruption

## Compatibility

### Backward Compatibility
- Automatic migration of existing notes
- Preserve all note content and metadata
- Maintain note relationships (collections)
- Backup original files before migration

### Forward Compatibility
- Use standard markdown format
- Store metadata in portable format
- Design for future feature additions
- Maintain API stability

### External Tool Compatibility
- Standard `.md` file extension
- Human-readable filenames
- Standard markdown content
- Portable metadata format