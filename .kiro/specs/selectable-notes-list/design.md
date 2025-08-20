# Design Document

## Overview

The selectable notes list component will be a new React component that extends the existing NoteList functionality to support bulk selection operations. The component will integrate seamlessly with the current design system, using shadcn/ui components and following the established patterns in the codebase.

The component will operate in two distinct modes:
1. **Default Mode**: Clean list view without selection controls
2. **Selection Mode**: Enhanced view with checkboxes and bulk operation controls

## Architecture

### Component Structure

```
SelectableNotesList
├── Header Section
│   ├── Section Title (Notes + count)
│   └── Controls Container
│       ├── Default Mode: Select Button + Sort Button
│       └── Selection Mode: Bulk Actions Toolbar
├── Notes List Container
│   ├── Default Mode: Simple list items
│   └── Selection Mode: Checkboxes + list items
└── Selection Feedback (Selection Mode only)
```

### State Management

The component will use React's `useState` hooks for local state management:

```typescript
interface SelectableNotesListState {
  isSelectionMode: boolean;
  selectedIds: string[];
}

// Derived states (computed)
const selectAll: boolean = selectedIds.length === notes.length && notes.length > 0;
const indeterminate: boolean = selectedIds.length > 0 && selectedIds.length < notes.length;
const hasSelections: boolean = selectedIds.length > 0;
```

### Integration Points

The component will integrate with existing systems:
- **NoteList Component**: Will be refactored to use the new SelectableNotesList
- **shadcn/ui Components**: Checkbox and Button components
- **Performance Hooks**: Existing performance monitoring hooks
- **Theme System**: Current theme and transparency effects

## Components and Interfaces

### Main Component Interface

```typescript
interface SelectableNotesListProps {
  notes: Note[];
  onNoteClick: (note: Note) => void;
  activeNoteId?: string;
  onNoteDelete?: (noteId: string) => void;
  onCollectionUpdate?: () => void;
  activeCollectionId?: string;
  activeCollectionName?: string;
  allNotes?: Note[];
  onNewNote?: () => void;
  // New props for selection functionality
  onSelectionChange?: (selectedIds: string[]) => void;
  enableSelection?: boolean;
}
```

### Internal Component Structure

```typescript
// Header Controls Component
interface HeaderControlsProps {
  isSelectionMode: boolean;
  hasNotes: boolean;
  selectedCount: number;
  totalCount: number;
  onEnterSelection: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
}

// Note List Item Component
interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  isSelectionMode: boolean;
  onNoteClick: (note: Note) => void;
  onSelectionToggle: (noteId: string) => void;
  isActive: boolean;
}
```

### Event Handlers

```typescript
// Selection mode management
const handleEnterSelectionMode = useCallback(() => void, []);
const handleExitSelectionMode = useCallback(() => void, []);

// Bulk operations
const handleSelectAll = useCallback(() => void, [notes]);
const handleDeselectAll = useCallback(() => void, []);

// Individual selection
const handleNoteSelectionToggle = useCallback((noteId: string) => void, [selectedIds]);
```

## Data Models

### Selection State Model

```typescript
interface SelectionState {
  isSelectionMode: boolean;
  selectedIds: string[];
}

// Derived computed properties
interface ComputedSelectionState {
  selectAll: boolean;
  indeterminate: boolean;
  hasSelections: boolean;
  selectedCount: number;
}
```

### Note Display Model

The component will work with the existing Note interface but will focus on these properties:
- `title`: Primary display text
- `id` or `title`: Unique identifier for selection tracking
- Additional properties for existing NoteCard functionality

## Error Handling

### Edge Cases and Error States

1. **Empty Notes List**
   - Display "No notes available" message
   - Hide/disable Select button
   - Gracefully handle selection mode with empty list

2. **Dynamic Notes Changes**
   - Clear invalid selections when notes list changes
   - Recompute selection states
   - Handle notes being deleted while selected

3. **Selection State Corruption**
   - Validate selectedIds against current notes
   - Filter out non-existent note IDs
   - Reset to safe state if corruption detected

### Error Recovery

```typescript
// Validation function for selection state
const validateSelections = useCallback((ids: string[], currentNotes: Note[]) => {
  const validIds = currentNotes.map(note => note.title || note.id);
  return ids.filter(id => validIds.includes(id));
}, []);

// Effect to clean up invalid selections
useEffect(() => {
  const validSelections = validateSelections(selectedIds, notes);
  if (validSelections.length !== selectedIds.length) {
    setSelectedIds(validSelections);
  }
}, [notes, selectedIds, validateSelections]);
```

## Testing Strategy

### Unit Tests

1. **State Management Tests**
   - Selection mode toggle functionality
   - Bulk selection operations (select all, deselect all)
   - Individual note selection/deselection
   - Selection state validation and cleanup

2. **Component Rendering Tests**
   - Default mode rendering
   - Selection mode rendering
   - Empty state handling
   - Selection feedback display

3. **Event Handler Tests**
   - Button click handlers
   - Checkbox interaction handlers
   - Keyboard navigation support

### Integration Tests

1. **Performance Tests**
   - Large note list rendering performance
   - Selection state update performance
   - Memory usage with many selections

2. **Accessibility Tests**
   - Screen reader compatibility
   - Keyboard navigation
   - ARIA attributes validation
   - Focus management

### User Experience Tests

1. **Interaction Flow Tests**
   - Complete selection workflow
   - Mode switching behavior
   - Selection persistence during operations

2. **Visual Regression Tests**
   - UI consistency across modes
   - Theme integration
   - Responsive behavior

### Test Implementation Approach

```typescript
// Example test structure
describe('SelectableNotesList', () => {
  describe('Selection Mode', () => {
    it('should enter selection mode when Select button is clicked');
    it('should show checkboxes and toolbar in selection mode');
    it('should exit selection mode when Cancel is clicked');
  });

  describe('Bulk Operations', () => {
    it('should select all notes when Select All is clicked');
    it('should deselect all notes when Deselect All is clicked');
    it('should handle indeterminate state correctly');
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on all interactive elements');
    it('should support keyboard navigation');
    it('should announce selection changes to screen readers');
  });
});
```

## Performance Considerations

### Optimization Strategies

1. **Memoization**
   - Use `useCallback` for all event handlers
   - Memoize derived selection states
   - Optimize re-renders with `React.memo` for list items

2. **State Updates**
   - Batch selection state updates
   - Use functional state updates to avoid stale closures
   - Minimize unnecessary re-renders

3. **Large Lists**
   - Maintain existing virtualization if present
   - Efficient selection state lookup (Set vs Array)
   - Debounce selection change callbacks

### Performance Monitoring

The component will integrate with existing performance monitoring:
- Use existing `useRenderPerformance` hook
- Measure selection operation performance
- Monitor memory usage for large selection sets

## UI/UX Design Specifications

### Layout Structure

```css
/* Header layout with flex justify-between */
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Selection toolbar layout */
.selection-toolbar {
  display: flex;
  gap: 0.5rem; /* space-x-2 */
}

/* Checkbox alignment */
.note-item-checkbox {
  margin-right: 0.5rem; /* mr-2 */
}
```

### Visual States

1. **Default Mode**
   - Select button positioned next to sort button
   - Clean list without checkboxes
   - Standard note item styling

2. **Selection Mode**
   - Checkboxes visible with consistent padding
   - Toolbar replaces Select button
   - Selection feedback below list
   - Cancel button with outline variant

### Accessibility Features

1. **ARIA Labels**
   ```typescript
   // Button labels
   "Enter selection mode"
   "Select all notes"
   "Deselect all notes"
   "Cancel selection"
   
   // Checkbox labels
   `Select note: ${note.title}`
   
   // List attributes
   role="group"
   aria-labelledby="notes-section-title"
   ```

2. **Live Regions**
   ```typescript
   <p aria-live="polite">
     {hasSelections && `Selected: ${selectedCount} notes`}
   </p>
   ```

3. **Keyboard Support**
   - Tab navigation through all interactive elements
   - Space/Enter to toggle checkboxes and activate buttons
   - Escape key to exit selection mode

### Theme Integration

The component will respect the existing theme system:
- Use current color variables and transparency effects
- Support light/dark mode switching
- Maintain macOS vibrancy effects where applicable
- Follow existing button and checkbox styling patterns