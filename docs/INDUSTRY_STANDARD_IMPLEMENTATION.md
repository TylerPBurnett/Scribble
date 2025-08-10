# Industry Standard Note Creation Implementation

## Overview
We've implemented the industry-standard approach for note creation that matches the behavior of popular note-taking apps like Apple Notes, Obsidian, Notion, VS Code, and OneNote.

## Key Features

### 1. Immediate File Creation
- Notes are saved to disk immediately upon creation
- Empty notes persist in the file system and notes list
- Users can return to empty notes they started

### 2. Auto-Incrementing Titles
- First note: "Untitled Note"
- Subsequent notes: "Untitled Note 2", "Untitled Note 3", etc.
- Prevents duplicate titles automatically
- Checks existing notes to find the next available number

### 3. Predictable Behavior
- Notes always appear in the list after creation
- Matches user expectations from other apps
- No "missing" notes that users thought they created
- Consistent with professional note-taking applications

## Implementation Details

### Main Process (`electron/main.ts`)
```typescript
// Generate unique title by checking existing files
let title = 'Untitled Note';
if (saveLocation && fsSync.existsSync(saveLocation)) {
  const files = await fs.readdir(saveLocation);
  const markdownFiles = files.filter(f => f.endsWith('.md'));
  
  // Extract titles from existing notes
  const existingTitles = new Set<string>();
  for (const file of markdownFiles) {
    const filePath = path.join(saveLocation, file);
    const content = await fs.readFile(filePath, 'utf8');
    const titleMatch = content.match(/^# (.+)$/m);
    if (titleMatch) {
      existingTitles.add(titleMatch[1]);
    }
  }
  
  // Generate unique title
  if (existingTitles.has('Untitled Note')) {
    let number = 2;
    while (existingTitles.has(`Untitled Note ${number}`)) {
      number++;
    }
    title = `Untitled Note ${number}`;
  }
}
```

### Note Service (`src/shared/services/noteService.ts`)
```typescript
// Helper function to generate unique title for new notes
const generateUniqueTitle = async (): Promise<string> => {
  const baseTitle = 'Untitled Note';
  const existingNotes = await getNotes();
  
  const untitledNotes = existingNotes.filter(note => 
    note.title === baseTitle || note.title.startsWith(`${baseTitle} `)
  );
  
  if (untitledNotes.length === 0) {
    return baseTitle;
  }
  
  let number = 2;
  while (existingNotes.some(note => note.title === `${baseTitle} ${number}`)) {
    number++;
  }
  
  return `${baseTitle} ${number}`;
};
```

## Benefits

### User Experience
✅ **Predictable**: Users know their notes are always saved
✅ **Familiar**: Matches behavior of other popular apps
✅ **Reliable**: No lost work or missing notes
✅ **Simple**: Clear mental model - "I created it, it exists"

### Technical
✅ **Simpler State Management**: No complex transient state
✅ **Consistent**: All notes follow the same lifecycle
✅ **Debuggable**: Files exist on disk immediately
✅ **Recovery**: Users can access all created notes

## File Structure

Each note is saved as a Markdown file with:
- Title as H1 header
- Content in Markdown format
- Metadata in HTML comment with UUID

Example:
```markdown
# Untitled Note 2

Note content here...

<!-- scribble-metadata: {"id":"76858c2e-b6fd-4c3c-4bf62c3bad39"} -->
```

## Testing

### Test Cases
1. **First Note**: Create new note → Should be "Untitled Note"
2. **Second Note**: Create another → Should be "Untitled Note 2"
3. **Gap Handling**: Delete "Untitled Note 2", create new → Should reuse "Untitled Note 2"
4. **Empty Notes**: Create and close without editing → Should persist in list
5. **Reopening**: All created notes should be reopenable

## Comparison with Previous Approach

### Previous (Deferred Save)
- Notes only saved when content added
- Complex transient state management
- Empty notes disappeared from list
- Could cause confusion

### Current (Industry Standard)
- Notes saved immediately
- Simple, predictable behavior
- All notes persist
- Matches user expectations

## Conclusion

This implementation follows industry best practices and provides a professional, predictable user experience that matches what users expect from modern note-taking applications.
