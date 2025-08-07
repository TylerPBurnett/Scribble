# Search Command Palette Documentation

## Overview
The Search Command Palette is a powerful, responsive search interface that provides quick access to notes, actions, and collections. It features a Scribble-like responsive design with advanced search scoping capabilities.

## Features

### 🔍 **Responsive Search Bar**
- **Dynamic Width**: Automatically resizes between 100px - 400px based on window size
- **Perfect Centering**: Stays centered between macOS traffic lights and action buttons
- **Smooth Animations**: 0.2s ease-out transitions for width changes
- **Window Dragging**: Maintains draggable title bar functionality

### 🎯 **Smart Search Scoping**
- **Collection-Aware**: Respects active collection context by default
- **Scope Toggle**: Switch between searching current collection vs all notes
- **Visual Indicators**: Clear icons and text showing current search scope
- **Keyboard Shortcut**: `⌘⇧F` to toggle search scope

### ⚡ **Quick Actions**
- **New Note**: `⌘N` - Create a new note
- **Settings**: `⌘,` - Open application settings
- **Search Scope Toggle**: `⌘⇧F` - Toggle between collection/all notes search

## User Interface

### Search Bar (Closed State)
```
[🔍] Scribble                    [⚙️] [+]
```
- Displays "Scribble" placeholder when empty
- Shows current search query when active
- Click to open command palette

### Command Palette (Open State)
```
┌─────────────────────────────────────────┐
│ Search notes or type a command...       │
├─────────────────────────────────────────┤
│ Actions                                 │
│ ➕ New Note                        ⌘N   │
│ ⚙️  Settings                       ⌘,   │
│ 🌐 Search in: All Notes          ⌘⇧F   │
├─────────────────────────────────────────┤
│ Search Results in Work Notes (3)        │
│ 📄 Project Planning                     │
│ 📄 Meeting Notes                        │
│ 📄 Task List                            │
└─────────────────────────────────────────┘
```

## Search Scoping Behavior

### Default Behavior
- **In "All Notes"**: Searches across all notes (no scope toggle shown)
- **In Specific Collection**: Searches only within that collection

### Scope Toggle (⌘⇧F)
- **Collection Scope** (🔍): Search within current collection only
- **Global Scope** (🌐): Search across all notes regardless of collection

### Visual Feedback
- **Search Results Header**: Shows "Search Results in [Scope] (count)"
- **Toggle Button**: Displays current scope with appropriate icon
- **Dynamic Text**: Updates to show "Search in: [Collection Name]" or "Search in: All Notes"

## Search Categories

### 1. Search Results (When Typing)
- Shows up to 10 matching notes
- Searches both title and content
- Respects current search scope
- Displays last modified time

### 2. Recent Notes (When Empty)
- Last 5 modified notes
- Sorted by most recent first
- Shows relative timestamps

### 3. Favorite Notes (When Empty)
- All starred/favorited notes
- Filled star icon indicator
- Shows last modified time

### 4. Collections (When Empty)
- Non-empty collections only
- Shows note count for each collection
- Hash icon indicator
- Read-only display

## Technical Implementation

### Responsive Width Calculation
```typescript
const calculateSearchBarWidth = () => {
  const availableWidth = toolbarWidth - leftSpacerWidth - rightActionsWidth - padding - gaps;
  const targetWidth = Math.max(minWidth, Math.min(maxWidth, availableWidth));
  setSearchBarWidth(targetWidth);
};
```

### Search Filtering Logic
```typescript
const filteredNotes = notes.filter(note => {
  // Collection filtering (if not searching all notes)
  if (!searchAllNotes && activeCollectionId !== 'all') {
    const activeCollection = collections.find(c => c.id === activeCollectionId);
    if (activeCollection && !activeCollection.noteIds.includes(note.id)) {
      return false;
    }
  }
  
  // Text search
  const lowerQuery = value.toLowerCase();
  return (
    note.title.toLowerCase().includes(lowerQuery) ||
    note.content.toLowerCase().includes(lowerQuery)
  );
});
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` or `⌘P` | Open search palette |
| `⌘N` | Create new note |
| `⌘,` | Open settings |
| `⌘⇧F` | Toggle search scope |
| `Escape` | Close palette |
| `Enter` | Select highlighted item |
| `↑/↓` | Navigate results |

## Responsive Breakpoints

| Window Width | Search Bar Width | Behavior |
|--------------|------------------|----------|
| < 400px | 100px (minimum) | Buttons always visible |
| 400px - 800px | Dynamic (100-400px) | Scales with available space |
| > 800px | 400px (maximum) | Prevents over-expansion |

## Integration Points

### MainApp.tsx
```typescript
<CompactToolbar
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  onNewNote={handleNewNote}
  onOpenSettings={handleOpenSettings}
  notes={notes}
  onNoteClick={handleNoteClick}
  isSearchOpen={isSearchOpen}
  onSearchOpenChange={setSearchOpen}
  collections={collections}
  activeCollectionId={activeCollectionId}
/>
```

### Collection Integration
- Receives `activeCollectionId` and `collections` props
- Filters search results based on collection membership
- Updates search scope display dynamically

## Performance Considerations

- **ResizeObserver**: Efficient window resize detection
- **Debounced Calculations**: Prevents excessive recalculations
- **Limited Results**: Shows maximum 10 search results
- **Memoized Filtering**: Optimized note filtering logic

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all actions
- **Screen Reader**: Proper ARIA labels and roles
- **Focus Management**: Logical tab order and focus states
- **Visual Indicators**: Clear icons and text for all states

## Browser Compatibility

- **Modern Browsers**: Uses ResizeObserver (IE11+ support)
- **Fallback Support**: Window resize events for older browsers
- **Electron Optimized**: Designed for Electron app environment
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Customization Options

### Width Constraints
```typescript
const minWidth = 100; // Minimum search bar width
const maxWidth = 400; // Maximum search bar width
```

### Search Limits
```typescript
filteredNotes.slice(0, 10) // Maximum search results shown
recentNotes.slice(0, 5)    // Maximum recent notes shown
```

### Animation Timing
```css
transition: 'width 0.2s ease-out' // Search bar resize animation
```

## Troubleshooting

### Search Bar Too Wide/Narrow
- Check `minWidth` and `maxWidth` constants in `CompactToolbar.tsx`
- Verify window resize detection is working
- Ensure proper padding calculations

### Search Not Respecting Collections
- Verify `activeCollectionId` prop is passed correctly
- Check collection filtering logic in `filteredNotes`
- Ensure collections array includes note IDs

### Performance Issues
- Check ResizeObserver cleanup in useEffect
- Verify search result limits are applied
- Monitor for excessive re-renders during resize

## Future Enhancements

- **Search History**: Remember recent searches
- **Advanced Filters**: Filter by date, tags, or note type
- **Search Highlighting**: Highlight matching text in results
- **Fuzzy Search**: More intelligent text matching
- **Search Analytics**: Track search patterns and usage