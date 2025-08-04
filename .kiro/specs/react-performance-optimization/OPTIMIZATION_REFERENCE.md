# React Performance Optimization - Technical Reference

## 🔧 Quick Reference Guide

This document provides a quick technical reference for the performance optimizations implemented in the Scribble application.

## 📁 Optimized Components

### 1. NoteCard (`src/main-window/components/NoteCard.tsx`)

**Optimization**: React.memo with custom comparison + consolidated state

```typescript
// Memoization with custom comparison
const NoteCard = React.memo(({ note, onClick, isActive, ... }) => {
  // Consolidated menu state (was 8+ useState hooks)
  const [menuState, setMenuState] = useState({
    showMenu: false,
    showColorPicker: false,
    showConfirmDelete: false,
    showCollectionManager: false,
    menuPosition: { x: 0, y: 0 },
    isContextMenu: false,
    isAnimating: false,
  });

  // Memoized event handlers
  const handleNoteClick = useCallback(async (e) => {
    // ... optimized click handling
  }, [note, onClick, menuState.showMenu, menuState.isAnimating]);

}, areNoteCardPropsEqual);
```

**Key Features**:
- Custom comparison function prevents unnecessary re-renders
- Consolidated state reduces complexity
- useCallback for stable event handlers

### 2. NoteList (`src/main-window/components/NoteList.tsx`)

**Optimization**: Memoized expensive operations

```typescript
const NoteList = ({ notes, onNoteClick, ... }) => {
  // Memoized filtering
  const filteredNotes = useMemoizedFilter(
    notes,
    (notes) => notes.filter(note => !deletedNotes.includes(note.id)),
    [notes, deletedNotes],
    'note-list-filter-deleted'
  );

  // Memoized sorting
  const sortedNotes = useMemoizedSort(
    filteredNotes,
    (notes) => sortNotes(notes),
    [filteredNotes, sortOption],
    `note-list-sort-${sortOption.field}-${sortOption.direction}`
  );

  // Memoized categorization
  const { favoriteItems, otherItems } = useMemoizedCategorization(
    sortedNotes,
    (notes) => ({ 
      favoriteItems: notes.filter(n => n.favorite),
      otherItems: notes.filter(n => !n.favorite)
    }),
    [sortedNotes],
    'note-list-categorize-favorites'
  );
};
```

**Key Features**:
- useMemoizedFilter for deleted note filtering
- useMemoizedSort for expensive sorting operations
- useMemoizedCategorization for favorite/other separation
- useCallback for event handlers

### 3. NoteEditor (`src/note-window/components/NoteEditor.tsx`)

**Optimization**: Consolidated state with useReducer

```typescript
const NoteEditor = ({ note, onSave, onChange }) => {
  // Consolidated state (was 13+ useState hooks)
  const [state, dispatch] = useReducer(noteEditorReducer, 
    initializeStateFromNote(note, settings)
  );

  const { noteData, uiState, editorState } = state;

  // Memoized event handlers
  const handleTitleChange = useCallback((newTitle) => {
    dispatch(updateNoteData({ title: newTitle }));
  }, []);

  const handleContentChange = useCallback((newContent) => {
    dispatch(updateNoteData({ content: newContent }));
  }, []);
};
```

**State Structure**:
```typescript
interface NoteEditorState {
  noteData: {
    title: string;
    content: string;
    color: string;
    transparency: number;
    isPinned: boolean;
    isFavorite: boolean;
  };
  uiState: {
    showSettingsMenu: boolean;
    showColorPicker: boolean;
    isTitleFocused: boolean;
    isDragging: boolean;
  };
  editorState: {
    isDirty: boolean;
    isNewNote: boolean;
    tempTitle: string;
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
  };
}
```

## 🎯 Performance Monitoring

### Built-in Hooks

```typescript
// Component render tracking
useRenderPerformance(componentName);

// Memoization hit rate tracking  
useMemoizationTracking(componentName, dependencies);

// Expensive operation measurement
const { measureOperation } = useNoteCardPerformance(componentName);
```

### Performance Dashboard

Access real-time performance metrics:
- Component render counts and timing
- Memoization hit rates
- Expensive operation durations
- Memory usage patterns

## 🧪 Testing Patterns

### Memoization Testing

```typescript
it('should not re-render when props haven\'t changed', () => {
  const { rerender } = render(<NoteCard {...defaultProps} />);
  
  // Re-render with identical props
  rerender(<NoteCard {...defaultProps} />);
  
  // Component should still render correctly (memoization working)
  expect(screen.getByText('Note Title')).toBeInTheDocument();
});
```

### State Consolidation Testing

```typescript
it('should handle consolidated state updates', () => {
  render(<NoteEditor {...defaultProps} />);
  
  // Test multiple state updates
  fireEvent.change(titleInput, { target: { value: 'New Title' } });
  fireEvent.change(contentEditor, { target: { value: 'New Content' } });
  
  // Both updates should be reflected
  expect(screen.getByDisplayValue('New Title')).toBeInTheDocument();
  expect(screen.getByTestId('editor-content')).toHaveValue('New Content');
});
```

## 🔍 Debugging Performance Issues

### Performance Dashboard Usage

1. **Open Performance Dashboard**: Check the built-in performance monitoring
2. **Check Render Counts**: Look for components with excessive re-renders
3. **Monitor Memoization**: Verify cache hit rates are high (>80%)
4. **Track Operation Timing**: Identify slow operations

### Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Excessive re-renders | High render counts in dashboard | Check React.memo comparison function |
| Slow sorting | High sort operation times | Verify useMemo dependencies |
| Memory leaks | Increasing memory usage | Check useCallback dependencies |
| State updates not batching | Multiple rapid re-renders | Verify useReducer usage |

## 📋 Best Practices

### When to Use Each Optimization

- **React.memo**: Components that receive complex props or render frequently
- **useMemo**: Expensive computations (sorting, filtering, calculations)
- **useCallback**: Event handlers passed to child components
- **useReducer**: Complex state with multiple related values

### Performance Monitoring Guidelines

1. **Always measure**: Use performance hooks in optimized components
2. **Set baselines**: Document performance before optimizations
3. **Monitor continuously**: Check dashboard regularly
4. **Test with real data**: Use realistic dataset sizes

### Maintenance Checklist

- [ ] Performance dashboard shows healthy metrics
- [ ] Memoization hit rates above 80%
- [ ] No excessive re-renders (>10 per interaction)
- [ ] Tests passing for all optimized components
- [ ] No memory leaks in development tools

## 🚀 Adding New Optimizations

### Template for New Memoized Component

```typescript
import { memo, useCallback, useMemo } from 'react';
import { useRenderPerformance, useMemoizationTracking } from '../hooks/usePerformanceMonitoring';

interface MyComponentProps {
  data: any[];
  onAction: (item: any) => void;
}

const MyComponent = memo(({ data, onAction }: MyComponentProps) => {
  // Performance monitoring
  const componentName = 'MyComponent';
  useRenderPerformance(componentName);
  useMemoizationTracking(componentName, [data]);

  // Memoized computation
  const processedData = useMemo(() => {
    return data.map(item => processItem(item));
  }, [data]);

  // Memoized event handler
  const handleAction = useCallback((item: any) => {
    onAction(item);
  }, [onAction]);

  return (
    <div>
      {processedData.map(item => (
        <div key={item.id} onClick={() => handleAction(item)}>
          {item.name}
        </div>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison logic
  return prevProps.data === nextProps.data;
});

export default MyComponent;
```

---

*This reference guide covers the key technical details for maintaining and extending the performance optimizations.*