# Simple Duplication Fix

## The Problem
- Creating "Untitled Note" → renaming to "abc" → creates both files
- Complex deferred saving logic was causing issues
- Multiple code paths for file operations

## The Simple Solution

### 1. Always Save Notes Immediately
- New notes are saved to disk as "untitled-note.md" immediately
- No more complex "unsaved" state management
- Files always exist on disk

### 2. Simple Rename Logic
- When title changes: pass `originalTitle` to `saveNote()`
- `saveNote()` detects rename and calls IPC with `oldTitle`
- IPC handler renames the file instead of creating new one

### 3. Single Code Path
- All saves go through the same `saveNote()` function
- No more dual file operation systems
- Consistent behavior

## Key Changes Made

1. **noteService.ts**:
   - `createNote()` now saves immediately to disk
   - `saveNote()` simplified with clear rename detection
   - Removed complex unsaved note logic

2. **NoteEditor.tsx**:
   - Track `originalTitleRef` for rename detection
   - `performTitleRename()` uses same save mechanism
   - Simplified title change logic

3. **smartAutosaveService.ts**:
   - Removed complex unsaved note checks
   - All notes treated equally for autosave

## Expected Behavior
1. Create note → "untitled-note.md" saved to disk
2. Rename to "abc" → file renamed from "untitled-note.md" to "abc.md"
3. Only "abc.md" exists, no duplicates
4. All subsequent saves update "abc.md"

## Test Steps
1. Create new note
2. Verify "untitled-note.md" exists on disk
3. Change title to "abc"
4. Verify file is renamed to "abc.md"
5. Verify "untitled-note.md" no longer exists