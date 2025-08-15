# Window Close Duplication Fix

## The Real Problem
The autosave service was holding a **stale reference** to the original note object. When the window closed, it saved using the old title, creating the duplicate.

## Root Cause
1. **Autosave initialization**: `initializeAutosave(noteWithFlags, ...)` - uses original note
2. **Title change**: Note title changes in NoteEditor, but autosave service doesn't know
3. **Window close**: `beforeunload` handler saves with **original title** → creates duplicate

## The Fix
Updated SmartAutosaveService to use **current note reference** instead of stale one:

### Changes Made:
1. **Added `getCurrentNote` callback** to autosave service
2. **Updated all autosave methods** to use current note instead of stale reference
3. **NoteEditor passes current note reference** via `() => currentNoteRef.current`

### Before (Broken):
```typescript
// Autosave service holds stale note reference
const handleBeforeUnload = async () => {
  await this.saveImmediately(note, content, onSave); // Uses OLD title!
}
```

### After (Fixed):
```typescript
// Autosave service gets current note reference
const handleBeforeUnload = async () => {
  const currentNote = this.getCurrentNote ? this.getCurrentNote() : note;
  await this.saveImmediately(currentNote, content, onSave); // Uses CURRENT title!
}
```

## Test Scenario
1. Create new note → "untitled-note.md" created
2. Change title to "abc" → file renamed to "abc.md"
3. Close window → should NOT create "untitled-note.md"
4. Check filesystem → only "abc.md" should exist

## Expected Result
- No duplicate files when closing renamed notes
- Window close saves use the current title, not the original title