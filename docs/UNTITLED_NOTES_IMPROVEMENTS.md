# Untitled Notes Handling Improvements

## Problem Analysis

### Current Issues
1. **File Creation Timing**: Untitled notes immediately create empty files on disk, leading to orphaned files when users close without editing
2. **ID Mismatch**: Inconsistent ID generation between different parts of the codebase causes notes to become "unfindable"
3. **Empty Content Handling**: System doesn't differentiate between truly new notes and those that just haven't been edited yet
4. **User Experience**: Users see error messages when trying to reopen untitled notes they created but didn't edit

## Implemented Solution

### 1. Deferred File Creation
- **New Behavior**: Files are only created when a note has meaningful content or a custom title
- **Implementation**: Added `_unsaved` flag to track notes that exist only in memory
- **Benefits**: 
  - No orphaned empty files
  - Cleaner file system
  - Better performance (fewer unnecessary I/O operations)

### 2. Stable UUID System
- **Consistent IDs**: Using UUID v4 throughout the system for stable, unique identifiers
- **Metadata Embedding**: Every saved note includes its UUID in metadata comments
- **Registry System**: Main process maintains a mapping of note IDs to file paths

### 3. Transient Note Storage
- **Memory-Only Notes**: Untitled notes without content exist only in memory until saved
- **Transient Registry**: Main process stores unsaved notes in a temporary registry
- **Smart Retrieval**: `getNoteById` checks transient storage before file system

### 4. Smart Save Logic
```typescript
// Only save if the note has meaningful content or custom title
const hasContent = note.content !== '<p></p>' && note.content.trim() !== '';
const hasCustomTitle = note.title !== 'Untitled Note';

if (!hasContent && !hasCustomTitle) {
  // Skip save, keep note as transient
  return { ...note, _unsaved: true };
}
```

## User Experience Improvements

### Before
1. Create new note → Empty file created immediately
2. Close untitled note without editing → Orphaned file remains
3. Try to reopen → "Note not found" error

### After
1. Create new note → Exists only in memory
2. Close untitled note without editing → No file created, memory cleaned up
3. Start typing or change title → File created on first meaningful save
4. Reopen saved note → Works reliably with stable UUID

## Technical Changes

### Modified Files
1. **src/shared/types/Note.ts**: Added `_unsaved` flag
2. **src/shared/services/noteService.ts**: 
   - Improved `createNote` to mark notes as unsaved
   - Enhanced `updateNote` with smart save logic
   - Updated `getNoteById` to check transient storage
3. **electron/main.ts**: 
   - Enhanced transient note registry
   - Improved file lookup logic
   - Better handling of unsaved notes

### New Concepts
- **Transient Notes**: Notes that exist only in memory
- **Deferred Persistence**: Files created only when needed
- **Smart Save**: Intelligent decision about when to persist to disk

## Testing Scenarios

### Scenario 1: Empty Untitled Note
1. Create new note
2. Don't type anything
3. Close the note window
4. **Expected**: No file created, no errors

### Scenario 2: Edited Untitled Note
1. Create new note
2. Type some content
3. Auto-save triggers
4. **Expected**: File created with UUID in metadata

### Scenario 3: Title Change Only
1. Create new note
2. Change title from "Untitled Note" to something else
3. **Expected**: File created even without content

### Scenario 4: Reopen Saved Note
1. Create and save a note
2. Close it
3. Reopen from note list
4. **Expected**: Opens successfully with all content intact

## Future Enhancements

### Phase 1: User Feedback
- [ ] Add visual indicator for unsaved notes
- [ ] Show "This note hasn't been saved yet" message
- [ ] Prompt user before closing unsaved notes with content

### Phase 2: Recovery System
- [ ] Implement crash recovery for unsaved notes
- [ ] Add "Recently Closed" section for transient notes
- [ ] Auto-recovery on app restart

### Phase 3: Performance Optimization
- [ ] Batch file operations for multiple notes
- [ ] Implement lazy loading for large note collections
- [ ] Add indexing system for faster searches

## Best Practices Going Forward

1. **Always use UUIDs** for note identification
2. **Defer file I/O** until necessary
3. **Embed metadata** in all saved files
4. **Maintain consistency** between memory and disk state
5. **Provide clear feedback** to users about save status

## Migration Path

For existing users with orphaned untitled notes:
1. On next app launch, scan for empty "Untitled Note" files
2. Clean up files with no meaningful content
3. Preserve any files with actual content
4. Update all files to include UUID metadata

## Success Metrics

- **Reduced File Clutter**: Fewer orphaned files in notes directory
- **Improved Reliability**: No more "note not found" errors for valid notes
- **Better Performance**: Reduced unnecessary file I/O operations
- **Enhanced UX**: Clearer save status and fewer confusing error messages
