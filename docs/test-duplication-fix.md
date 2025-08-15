# Duplication Bug Fix Test

## Problem
When creating a new note titled "Untitled Note" and then renaming it to "abc", the system was creating both files:
- `untitled-note.md` 
- `abc.md`

## Root Cause
The `saveNote` function in `noteService.ts` was not passing the `oldTitle` parameter to the IPC handler, so the rename logic never triggered. Instead, it always created new files.

## Fix Applied
1. **Updated `saveNote` function** to accept and use an `originalTitle` parameter
2. **Modified NoteEditor** to track the original title and pass it during saves
3. **Updated SmartAutosaveService** to pass the original title when the title changes
4. **Fixed all `updateNote` calls** in NoteEditor to pass the original title

## Key Changes
- `noteService.ts`: Added `originalTitle` parameter to `saveNote`
- `NoteEditor.tsx`: Added `originalTitleRef` to track original title
- `smartAutosaveService.ts`: Pass original title for rename detection
- All save operations now properly detect title changes and rename files instead of creating duplicates

## Expected Behavior After Fix
1. Create new note → "Untitled Note" (unsaved, in memory only)
2. Change title to "abc" → Renames to "abc.md" (no duplicate)
3. File system shows only "abc.md"
4. No "untitled-note.md" file remains

## Test Steps
1. Create a new note
2. Change title from "Untitled Note" to "abc"
3. Add some content
4. Save the note
5. Check file system - should only see "abc.md"