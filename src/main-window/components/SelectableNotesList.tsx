import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Note } from '../../shared/types/Note';
import { deleteNote } from '../../shared/services/noteService';
import { getNotesSortOption, saveNotesSortOption, SortOption } from '../../shared/services/settingsService';
import NoteCard from './NoteCard';
import { useNoteListPerformance } from '../../shared/hooks/useExpensiveOperations';
import { useRenderPerformance } from '../../shared/hooks/usePerformanceMonitoring';
import { useMemoizedFilter, useMemoizedSort, useMemoizedCategorization } from '../../shared/hooks/useAsyncMemo';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// TypeScript interfaces for component props and internal state
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
  // New props for bulk operations
  onBulkDelete?: (selectedTitles: string[]) => Promise<void>;
  onBulkMoveToCollection?: (selectedTitles: string[], targetCollectionId: string) => Promise<void>;
  availableCollections?: Array<{ id: string; name: string; }>;
}

// SelectionState interface removed as it's not used - state is managed directly with useState

interface ComputedSelectionState {
  selectAll: boolean;
  indeterminate: boolean;
  hasSelections: boolean;
  selectedCount: number;
}

interface HeaderControlsProps {
  isSelectionMode: boolean;
  hasNotes: boolean;
  selectedCount: number;
  onEnterSelection: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
  onBulkDelete: () => void;
  onBulkMoveToCollection: (collectionId: string) => void;
  availableCollections: Array<{ id: string; name: string; }>;
  isLoading: boolean;
}

interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  isSelectionMode: boolean;
  onNoteClick: (note: Note) => void;
  onSelectionToggle: (noteTitle: string) => void;
  isActive: boolean;
  onDelete: (noteId: string) => void;
  onCollectionUpdate?: () => void;
  allNotes?: Note[];
}

const SelectableNotesList = ({ 
  notes, 
  onNoteClick, 
  activeNoteId, 
  onNoteDelete, 
  onCollectionUpdate, 
  activeCollectionId, 
  activeCollectionName, 
  allNotes = [], 
  onNewNote,
  onSelectionChange,
  enableSelection = true,
  onBulkDelete,
  onBulkMoveToCollection,
  availableCollections = []
}: SelectableNotesListProps) => {
  // Performance monitoring
  const componentName = 'SelectableNotesList';
  const { measureOperation } = useNoteListPerformance(componentName);
  useRenderPerformance(componentName);
  
  // TODO: Add memoization tracking when test mocking is fixed
  // useMemoizationTracking(componentName + '-selection-state', [selectedIds, notes.length]);
  // useMemoizationTracking(componentName + '-computed-state', [selectedIds.length, notes.length]);
  // useMemoizationTracking(componentName + '-filtered-notes', [notes, deletedNotes]);
  // useMemoizationTracking(componentName + '-sorted-notes', [filteredNotes, sortOption]);

  // Existing NoteList state
  const [deletedNotes, setDeletedNotes] = useState<string[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Detect if we're on macOS for vibrancy effects
  const [isMacOS, setIsMacOS] = useState(false);
  
  // Selection state management
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoadingBulkOperation, setIsLoadingBulkOperation] = useState<boolean>(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [showMoveToCollectionMenu, setShowMoveToCollectionMenu] = useState<boolean>(false);

  // Platform detection (optimized with useCallback)
  const checkPlatform = useCallback(async () => {
    if (window.electronAPI?.platform) {
      const platform = await window.electronAPI.platform();
      setIsMacOS(platform === 'darwin');
    } else {
      // Fallback: check user agent
      setIsMacOS(navigator.platform.toLowerCase().includes('mac'));
    }
  }, []);

  useEffect(() => {
    checkPlatform();
  }, [checkPlatform]);
  
  // Initialize sort option with lazy initial state to ensure it reads from localStorage
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const savedOption = getNotesSortOption();
    console.log('SelectableNotesList - Initializing sort option from settings:', savedOption);
    return savedOption;
  });
  
  const sortMenuRef = useRef<HTMLDivElement>(null);
  // Container ref that wraps both the button and the menu so outside-clicks work correctly
  const sortContainerRef = useRef<HTMLDivElement>(null);

  // Computed selection state - optimized for large lists using Set for O(1) lookups
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  
  const computedSelectionState: ComputedSelectionState = useMemo(() => {
    const selectedCount = selectedIds.length;
    const totalCount = notes.length;
    
    return {
      selectAll: selectedCount === totalCount && totalCount > 0,
      indeterminate: selectedCount > 0 && selectedCount < totalCount,
      hasSelections: selectedCount > 0,
      selectedCount
    };
  }, [selectedIds.length, notes.length]);

  // Selection mode management functions - optimized with useCallback
  const handleEnterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
    setSelectedIds([]); // Clear any previous selections
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  }, []);

  // Bulk selection operations - optimized for performance
  const handleSelectAll = useCallback(() => {
    const allNoteIds = notes.map(note => note.title);
    setSelectedIds(allNoteIds);
  }, [notes]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Individual note selection - optimized for large lists using Set operations
  const handleNoteSelectionToggle = useCallback((noteTitle: string) => {
    setSelectedIds(prev => {
      const prevSet = new Set(prev);
      if (prevSet.has(noteTitle)) {
        prevSet.delete(noteTitle);
      } else {
        prevSet.add(noteTitle);
      }
      return Array.from(prevSet);
    });
  }, []);

  // Bulk delete handler with confirmation
  const handleBulkDelete = useCallback(async () => {
    if (!onBulkDelete || selectedIds.length === 0) return;
    
    setIsLoadingBulkOperation(true);
    try {
      await onBulkDelete(selectedIds);
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error performing bulk delete:', error);
    } finally {
      setIsLoadingBulkOperation(false);
      setShowDeleteConfirmation(false);
    }
  }, [onBulkDelete, selectedIds]);

  // Bulk move to collection handler
  const handleBulkMoveToCollection = useCallback(async (targetCollectionId: string) => {
    if (!onBulkMoveToCollection || selectedIds.length === 0) return;
    
    setIsLoadingBulkOperation(true);
    try {
      await onBulkMoveToCollection(selectedIds, targetCollectionId);
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error performing bulk move to collection:', error);
    } finally {
      setIsLoadingBulkOperation(false);
      setShowMoveToCollectionMenu(false);
    }
  }, [onBulkMoveToCollection, selectedIds]);

  // Show delete confirmation dialog
  const showBulkDeleteConfirmation = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);


  // Selection validation and cleanup - optimized for large lists using Set
  const validateSelections = useCallback((ids: string[], currentNotes: Note[]) => {
    const validIds = new Set(currentNotes.map(note => note.title));
    return ids.filter(id => validIds.has(id));
  }, []);

  // Effect to clean up invalid selections when notes change
  useEffect(() => {
    const validSelections = validateSelections(selectedIds, notes);
    if (validSelections.length !== selectedIds.length) {
      setSelectedIds(validSelections);
    }
  }, [notes, selectedIds, validateSelections]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedIds);
    }
  }, [selectedIds, onSelectionChange]);

  // Keyboard navigation support - Escape key handler to exit selection mode (optimized)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Exit selection mode on Escape key
    if (event.key === 'Escape' && isSelectionMode) {
      event.preventDefault();
      handleExitSelectionMode();
    }
  }, [isSelectionMode, handleExitSelectionMode]);

  useEffect(() => {
    // Only add listener when in selection mode
    if (isSelectionMode) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelectionMode, handleKeyDown]);

  // Close sort menu when clicking outside (optimized)
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Node;
    // Close only if the click is fully outside the sort container (button + menu)
    if (sortContainerRef.current && !sortContainerRef.current.contains(target)) {
      setShowSortMenu(false);
    }
    
    // Close move to collection menu when clicking outside
    if (showMoveToCollectionMenu) {
      // Check if click is outside any move dropdown
      const moveMenus = document.querySelectorAll('[data-move-collection-menu]');
      let isOutsideAllMenus = true;
      moveMenus.forEach(menu => {
        if (menu.contains(target)) {
          isOutsideAllMenus = false;
        }
      });
      
      if (isOutsideAllMenus) {
        setShowMoveToCollectionMenu(false);
      }
    }
  }, [showMoveToCollectionMenu]);

  useEffect(() => {
    if (showSortMenu || showMoveToCollectionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortMenu, showMoveToCollectionMenu, handleClickOutside]);

  // Listen for sort option changes from other windows/tabs (optimized)
  const handleStorageChange = useCallback((e: StorageEvent) => {
    if (e.key === 'app_settings' && e.newValue) {
      try {
        const newSettings = JSON.parse(e.newValue);
        if (newSettings.notesSortOption) {
          console.log('SelectableNotesList - Sort option changed from another window:', newSettings.notesSortOption);
          setSortOption(newSettings.notesSortOption);
        }
      } catch (error) {
        console.error('Error parsing settings from storage event:', error);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStorageChange]);

  // Sort notes based on current sort option - memoized to avoid recreating function
  const sortNotes = useCallback((notesToSort: Note[]): Note[] => {
    return [...notesToSort].sort((a, b) => {
      if (sortOption.field === 'title') {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return sortOption.direction === 'asc'
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA);
      } else {
        const dateA = a[sortOption.field].getTime();
        const dateB = b[sortOption.field].getTime();
        return sortOption.direction === 'asc'
          ? dateA - dateB
          : dateB - dateA;
      }
    });
  }, [sortOption]);

  // Toggle sort menu - optimized with useCallback
  const toggleSortMenu = useCallback(() => {
    // Use functional update to avoid stale state and race conditions
    setShowSortMenu(prev => !prev);
  }, []);

  // Handle sort option selection with useCallback
  const handleSortOptionSelect = useCallback((option: SortOption) => {
    console.log('SelectableNotesList - Saving sort option:', option);
    setSortOption(option);
    saveNotesSortOption(option);
    setShowSortMenu(false);
  }, []);

  // Handle note deletion with useCallback
  const handleNoteDelete = useCallback(async (noteId: string) => {
    console.log('SelectableNotesList - Deleting note:', noteId);
    await measureOperation('selectable-note-list-delete', async () => {
      // Delete the note using the service
      try {
        await deleteNote(noteId);
        console.log('SelectableNotesList - Note deleted from service');

        // Add to deleted notes list to remove from UI
        setDeletedNotes(prev => [...prev, noteId]);

        // Remove from selections if it was selected (using title as identifier)
        const noteToDelete = notes.find(n => n.id === noteId);
        if (noteToDelete) {
          setSelectedIds(prev => prev.filter(id => id !== noteToDelete.title));
        }

        // Call the parent's onNoteDelete if provided
        if (onNoteDelete) {
          onNoteDelete(noteId);
        }
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    });
  }, [onNoteDelete, measureOperation]);

  // Filter out deleted notes with performance measurement
  const filteredNotes = useMemoizedFilter(
    notes,
    (notes) => notes.filter(note => note.id && !deletedNotes.includes(note.id)),
    [notes, deletedNotes],
    'selectable-note-list-filter-deleted'
  );

  // Apply sorting to notes with performance measurement
  const sortedFilteredNotes = useMemoizedSort(
    filteredNotes,
    (notes) => sortNotes(notes),
    [filteredNotes, sortOption],
    `selectable-note-list-sort-${sortOption.field}-${sortOption.direction}`
  );

  // Separate favorite notes from other notes with performance measurement
  const { favoriteItems: favoriteNotes, otherItems: otherNotes } = useMemoizedCategorization(
    sortedFilteredNotes,
    (notes) => {
      // Only include notes that are explicitly marked as favorites
      const favorites = notes.filter(note => note.favorite);
      // All other notes (including pinned ones) go in the regular notes section
      const others = notes.filter(note => !note.favorite);
      return { favoriteItems: favorites, otherItems: others };
    },
    [sortedFilteredNotes],
    'selectable-note-list-categorization'
  );

  // Header Controls Component - memoized to prevent unnecessary re-renders
  const HeaderControls = memo(({
    isSelectionMode,
    hasNotes,
    selectedCount,
    onEnterSelection,
    onSelectAll,
    onDeselectAll,
    onCancel,
    onBulkDelete,
    onBulkMoveToCollection,
    availableCollections,
    isLoading
  }: HeaderControlsProps) => {

    if (!enableSelection) {
      return null;
    }

    if (isSelectionMode) {
      return (
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="Selection controls">
          {/* Bulk Action Buttons - Floating pill-style container */}
          {selectedCount > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-background-tertiary/50 backdrop-blur-sm border border-border/30 animate-in fade-in slide-in-from-top-1 duration-200"
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {/* Count Badge */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-full">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span className="text-[10px] font-medium text-primary tabular-nums">
                  {selectedCount}
                </span>
              </div>

              {/* Divider */}
              <div className="w-px h-3.5 bg-border/40" />

              {/* Delete Button */}
              <button
                onClick={onBulkDelete}
                disabled={isLoading}
                className="group flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-danger/90 hover:text-danger hover:bg-danger/10 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Delete ${selectedCount} selected notes`}
                tabIndex={0}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-150 group-hover:scale-110"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {!isLoading && <span>Delete</span>}
              </button>

              {/* Move to Collection Button */}
              {availableCollections.length > 0 && (
                <div className="relative" data-move-collection-menu>
                  <button
                    onClick={() => setShowMoveToCollectionMenu(true)}
                    disabled={isLoading}
                    className="group flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-text-secondary hover:text-text hover:bg-background-notes/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Move ${selectedCount} selected notes to collection`}
                    tabIndex={0}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform duration-150 group-hover:scale-110"
                    >
                      <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {!isLoading && <span>Move</span>}
                  </button>

                  {/* Move to Collection Dropdown - Enhanced */}
                  {showMoveToCollectionMenu && (
                    <div
                      className="absolute right-0 top-7 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-2xl z-50 min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                      data-move-collection-menu
                      style={{
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div className="px-2.5 py-1.5 text-[9px] font-semibold text-text-tertiary tracking-wider uppercase border-b border-border/30">
                        Move to Collection
                      </div>
                      <div className="py-1">
                        {availableCollections
                          .filter(col => col.id !== activeCollectionId)
                          .map(collection => (
                          <button
                            key={collection.id}
                            onClick={() => onBulkMoveToCollection(collection.id)}
                            disabled={isLoading}
                            className="w-full text-left px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text hover:bg-background-notes/20 transition-all duration-100 disabled:opacity-50"
                          >
                            {collection.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selection Controls - Minimalist */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={onSelectAll}
              disabled={isLoading}
              className="px-2 py-1 text-[10px] font-medium text-text-tertiary hover:text-text rounded-md hover:bg-background-tertiary/30 transition-all duration-100"
              aria-label="Select all notes"
              tabIndex={0}
            >
              All
            </button>
            <button
              onClick={onDeselectAll}
              disabled={isLoading}
              className="px-2 py-1 text-[10px] font-medium text-text-tertiary hover:text-text rounded-md hover:bg-background-tertiary/30 transition-all duration-100"
              aria-label="Deselect all notes"
              tabIndex={0}
            >
              None
            </button>

            {/* Divider */}
            <div className="w-px h-3.5 bg-border/40 mx-0.5" />

            {/* Cancel Button - Emphasized */}
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="group flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-text-secondary hover:text-text rounded-md hover:bg-background-tertiary/50 transition-all duration-100"
              aria-label="Cancel selection mode"
              tabIndex={0}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-150 group-hover:rotate-90"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Done</span>
            </button>
          </div>
        </div>
      );
    }

    // Hide Select button when notes list is empty (requirement 1.3)
    return hasNotes ? (
      <button
        onClick={onEnterSelection}
        className="group flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-text-tertiary hover:text-text rounded-md hover:bg-background-tertiary/30 transition-all duration-150"
        aria-label="Enter selection mode to select multiple notes"
        tabIndex={0}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-150 group-hover:scale-110"
        >
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
        <span>Select</span>
      </button>
    ) : null;
  });

  // Note List Item Component - memoized to prevent unnecessary re-renders
  const NoteListItem = memo(({ 
    note, 
    isSelected, 
    isSelectionMode, 
    onNoteClick, 
    onSelectionToggle, 
    isActive, 
    onDelete,
    onCollectionUpdate,
    allNotes
  }: NoteListItemProps) => {
    const handleClick = useCallback(() => {
      if (isSelectionMode) {
        onSelectionToggle(note.title);
      } else {
        onNoteClick(note);
      }
    }, [isSelectionMode, note, onNoteClick, onSelectionToggle]);

    // Handle checkbox toggle - simplified to avoid conflicts
    const handleCheckboxToggle = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectionToggle(note.title);
    }, [note.title, onSelectionToggle]);

    // Keyboard handler for checkbox - space and enter key support
    const handleCheckboxKeyDown = useCallback((event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        handleCheckboxToggle(event);
      }
    }, [handleCheckboxToggle]);

    return (
      <div
        className={cn(
          "relative group/noteitem transition-all duration-200 ease-out",
          isSelectionMode
            ? "hover:translate-y-[-1px]" // Subtle lift in selection mode
            : "hover:translate-y-[-2px] hover:scale-[1.02]" // Full effect in normal mode
        )}
      >
        {/* Selection Overlay - Subtle highlight when selected */}
        {isSelectionMode && isSelected && (
          <div className="absolute inset-0 rounded-xl border-2 border-primary/40 pointer-events-none z-[5] animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-primary/5 rounded-xl" />
          </div>
        )}

        <NoteCard
          key={note.title}
          note={note}
          onClick={handleClick}
          isActive={isActive}
          onDelete={onDelete}
          isFavorite={note.favorite}
          onCollectionUpdate={onCollectionUpdate}
          allNotes={allNotes}
          isSelectionMode={isSelectionMode}
        />

        {/* Floating Checkbox Badge - Integrated into card */}
        {isSelectionMode && (
          <div
            className="absolute top-2 left-2 z-10 cursor-pointer animate-in fade-in zoom-in-95 duration-200"
            onKeyDown={handleCheckboxKeyDown}
            onClick={handleCheckboxToggle}
            tabIndex={0}
            role="checkbox"
            aria-checked={isSelected}
            aria-label={`Select note: ${note.title}`}
          >
            {/* Checkbox Container with glassmorphic effect */}
            <div
              className={cn(
                "relative flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-md transition-all duration-200",
                "shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)]",
                "border-2 hover:scale-110 active:scale-95",
                isSelected
                  ? "bg-primary/95 border-primary/80 scale-100"
                  : "bg-background/70 border-border/60 hover:border-primary/50 hover:bg-background/80"
              )}
              style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              {/* Checkmark with smooth animation */}
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "transition-all duration-200",
                  isSelected
                    ? "text-primary-foreground opacity-100 scale-100"
                    : "text-text-tertiary opacity-0 scale-50"
                )}
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>

              {/* Ripple effect on selection */}
              {isSelected && (
                <div
                  className="absolute inset-0 rounded-full bg-primary/40 animate-ping"
                  style={{
                    animationDuration: '600ms',
                    animationIterationCount: '1',
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="notes-container notes-container-transparent flex-1 px-4 py-4 overflow-y-auto transition-all duration-300">
      {/* Favorites Section */}
      {favoriteNotes.length > 0 && (
        <div className="notes-section mb-4">
          <div className="section-title flex items-center justify-between mb-2">
            <div id="favorites-section-title" className="flex items-center gap-2 text-xs font-normal text-text-tertiary tracking-wider">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              <span>Favorites</span>
            </div>
          </div>
          <div className="notes-grid grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3" role="group" aria-labelledby="favorites-section-title">
            {favoriteNotes.map((note) => (
              <NoteListItem
                key={note.title}
                note={note}
                isSelected={selectedIdsSet.has(note.title)}
                isSelectionMode={isSelectionMode}
                onNoteClick={onNoteClick}
                onSelectionToggle={handleNoteSelectionToggle}
                isActive={note.id === activeNoteId}
                onDelete={handleNoteDelete}
                onCollectionUpdate={onCollectionUpdate}
                allNotes={allNotes}
              />
            ))}
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="notes-section transparency-layer-content mb-4">
        <div className="section-title flex items-center justify-between mb-2">
          <div id="notes-section-title" className="flex items-center gap-2 text-xs font-normal text-text-tertiary tracking-wider">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Notes</span>
            <span className="text-[10px] bg-background-tertiary px-1.5 py-0.5 rounded-full" aria-label={`${otherNotes.length} notes`}>
              {otherNotes.length}
            </span>
          </div>

          {/* Controls Container - Select button and Sort button */}
          <div className="flex items-center space-x-2">
            <HeaderControls
              isSelectionMode={isSelectionMode}
              hasNotes={filteredNotes.length > 0}
              selectedCount={computedSelectionState.selectedCount}
              onEnterSelection={handleEnterSelectionMode}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onCancel={handleExitSelectionMode}
              onBulkDelete={showBulkDeleteConfirmation}
              onBulkMoveToCollection={handleBulkMoveToCollection}
              availableCollections={availableCollections}
              isLoading={isLoadingBulkOperation}
            />

            {/* Sort Button */}
            <div ref={sortContainerRef} className="relative" aria-hidden={isSelectionMode ? "true" : undefined}>
              <button
                className="sort-button flex items-center justify-center w-6 h-6 text-text-tertiary rounded-full hover:bg-background-tertiary/30 transition-colors"
                onClick={toggleSortMenu}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSortMenu();
                  }
                }}
                title="Sort notes"
                aria-expanded={showSortMenu}
                aria-haspopup="menu"
                tabIndex={isSelectionMode ? -1 : 0}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5h10"></path>
                  <path d="M11 9h7"></path>
                  <path d="M11 13h4"></path>
                  <path d="M3 17h18"></path>
                  <path d="M3 5l4 8"></path>
                  <path d="M7 5l-4 8"></path>
                </svg>
              </button>

              {/* Sort Menu - keeping existing implementation */}
              {showSortMenu && (
                <div
                  ref={sortMenuRef}
                  className={`sort-menu absolute right-0 top-8 rounded-md z-[100] min-w-[180px] overflow-hidden border text-xs font-twitter ${isMacOS ? 'backdrop-blur-xl bg-popover/80 light:bg-white/80 border-white/20 light:border-black/10 shadow-2xl' : 'bg-popover border-border shadow-card light:bg-white'}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  role="menu"
                  aria-label="Sort options"
                >
                  <div className={`py-1.5 px-3 text-text-tertiary border-b ${isMacOS ? 'border-white/10 light:border-black/10' : 'border-border'}`}>Sort By</div>
                  <button
                    className={`sort-menu-item flex items-center gap-2 w-full px-3 py-1.5 bg-transparent text-left cursor-pointer transition-colors ${isMacOS ? 'hover:bg-white/10 light:hover:bg-black/5' : 'hover:bg-secondary/60 light:hover:bg-secondary'} ${sortOption.field === 'title' && sortOption.direction === 'asc' ? `${isMacOS ? 'bg-white/20 light:bg-black/10' : 'bg-secondary/60 light:bg-secondary'} text-primary font-medium` : 'text-text-secondary'}`}
                    onClick={() => handleSortOptionSelect({ label: 'Title (A-Z)', field: 'title', direction: 'asc' })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSortOptionSelect({ label: 'Title (A-Z)', field: 'title', direction: 'asc' });
                      }
                    }}
                    role="menuitem"
                    aria-label="Sort by title A to Z"
                    tabIndex={0}
                  >
                    {sortOption.field === 'title' && sortOption.direction === 'asc' && (
                      <svg className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>Title (A-Z)</span>
                  </button>
                  <button
                    className={`sort-menu-item flex items-center gap-2 w-full px-3 py-1.5 bg-transparent text-left cursor-pointer transition-colors ${isMacOS ? 'hover:bg-white/10 light:hover:bg-black/5' : 'hover:bg-secondary/60 light:hover:bg-secondary'} ${sortOption.field === 'title' && sortOption.direction === 'desc' ? `${isMacOS ? 'bg-white/20 light:bg-black/10' : 'bg-secondary/60 light:bg-secondary'} text-primary font-medium` : 'text-text-secondary'}`}
                    onClick={() => handleSortOptionSelect({ label: 'Title (Z-A)', field: 'title', direction: 'desc' })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSortOptionSelect({ label: 'Title (Z-A)', field: 'title', direction: 'desc' });
                      }
                    }}
                    role="menuitem"
                    aria-label="Sort by title Z to A"
                    tabIndex={0}
                  >
                    {sortOption.field === 'title' && sortOption.direction === 'desc' && (
                      <svg className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>Title (Z-A)</span>
                  </button>
                  <button
                    className={`sort-menu-item flex items-center gap-2 w-full px-3 py-1.5 bg-transparent text-left cursor-pointer transition-colors ${isMacOS ? 'hover:bg-white/10 light:hover:bg-black/5' : 'hover:bg-secondary/60 light:hover:bg-secondary'} ${sortOption.field === 'createdAt' && sortOption.direction === 'desc' ? `${isMacOS ? 'bg-white/20 light:bg-black/10' : 'bg-secondary/60 light:bg-secondary'} text-primary font-medium` : 'text-text-secondary'}`}
                    onClick={() => handleSortOptionSelect({ label: 'Date Created (Newest)', field: 'createdAt', direction: 'desc' })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSortOptionSelect({ label: 'Date Created (Newest)', field: 'createdAt', direction: 'desc' });
                      }
                    }}
                    role="menuitem"
                    aria-label="Sort by date created, newest first"
                    tabIndex={0}
                  >
                    {sortOption.field === 'createdAt' && sortOption.direction === 'desc' && (
                      <svg className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>Date Created (Newest)</span>
                  </button>
                  <button
                    className={`sort-menu-item flex items-center gap-2 w-full px-3 py-1.5 bg-transparent text-left cursor-pointer transition-colors ${isMacOS ? 'hover:bg-white/10 light:hover:bg-black/5' : 'hover:bg-secondary/60 light:hover:bg-secondary'} ${sortOption.field === 'createdAt' && sortOption.direction === 'asc' ? `${isMacOS ? 'bg-white/20 light:bg-black/10' : 'bg-secondary/60 light:bg-secondary'} text-primary font-medium` : 'text-text-secondary'}`}
                    onClick={() => handleSortOptionSelect({ label: 'Date Created (Oldest)', field: 'createdAt', direction: 'asc' })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSortOptionSelect({ label: 'Date Created (Oldest)', field: 'createdAt', direction: 'asc' });
                      }
                    }}
                    role="menuitem"
                    aria-label="Sort by date created, oldest first"
                    tabIndex={0}
                  >
                    {sortOption.field === 'createdAt' && sortOption.direction === 'asc' && (
                      <svg className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>Date Created (Oldest)</span>
                  </button>
                  <button
                    className={`sort-menu-item flex items-center gap-2 w-full px-3 py-1.5 bg-transparent text-left cursor-pointer transition-colors ${isMacOS ? 'hover:bg-white/10 light:hover:bg-black/5' : 'hover:bg-secondary/60 light:hover:bg-secondary'} ${sortOption.field === 'updatedAt' && sortOption.direction === 'desc' ? `${isMacOS ? 'bg-white/20 light:bg-black/10' : 'bg-secondary/60 light:bg-secondary'} text-primary font-medium` : 'text-text-secondary'}`}
                    onClick={() => handleSortOptionSelect({ label: 'Date Modified (Newest)', field: 'updatedAt', direction: 'desc' })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSortOptionSelect({ label: 'Date Modified (Newest)', field: 'updatedAt', direction: 'desc' });
                      }
                    }}
                    role="menuitem"
                    aria-label="Sort by date modified, newest first"
                    tabIndex={0}
                  >
                    {sortOption.field === 'updatedAt' && sortOption.direction === 'desc' && (
                      <svg className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>Date Modified (Newest)</span>
                  </button>
                  <button
                    className={`sort-menu-item flex items-center gap-2 w-full px-3 py-1.5 bg-transparent text-left cursor-pointer transition-colors ${isMacOS ? 'hover:bg-white/10 light:hover:bg-black/5' : 'hover:bg-secondary/60 light:hover:bg-secondary'} ${sortOption.field === 'updatedAt' && sortOption.direction === 'asc' ? `${isMacOS ? 'bg-white/20 light:bg-black/10' : 'bg-secondary/60 light:bg-secondary'} text-primary font-medium` : 'text-text-secondary'}`}
                    onClick={() => handleSortOptionSelect({ label: 'Date Modified (Oldest)', field: 'updatedAt', direction: 'asc' })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSortOptionSelect({ label: 'Date Modified (Oldest)', field: 'updatedAt', direction: 'asc' });
                      }
                    }}
                    role="menuitem"
                    aria-label="Sort by date modified, oldest first"
                    tabIndex={0}
                  >
                    {sortOption.field === 'updatedAt' && sortOption.direction === 'asc' && (
                      <svg className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>Date Modified (Oldest)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selection Feedback - Requirements 4.1, 4.2 */}
        {isSelectionMode && computedSelectionState.hasSelections && (
          <p aria-live="polite" className="text-xs text-text-tertiary mb-2">
            Selected: {computedSelectionState.selectedCount} notes
          </p>
        )}

        {/* Empty State Handling - Requirements 1.2, 1.3 */}
        {filteredNotes.length === 0 ? (
          <div className="empty-state transparency-layer-content flex flex-col items-center justify-center py-12 text-center">
            <div className="empty-icon text-text-tertiary opacity-50 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-xl font-normal mb-2">
              {activeCollectionId === 'all' || !activeCollectionName 
                ? 'No notes available' 
                : `No notes in ${activeCollectionName}`}
            </h2>
            <p className="text-text-tertiary mb-6">
              {activeCollectionId === 'all' || !activeCollectionName
                ? 'Create your first note to get started'
                : `Create a note or add existing notes to ${activeCollectionName}`}
            </p>
            <Button
              onClick={() => {
                // Call the parent's onNewNote function to create a new note in the collection
                if (onNewNote) {
                  onNewNote();
                }
              }}
              tabIndex={-1}
              size="sm"
              className="gap-1.5 transition-all duration-200 hover:scale-105"
              aria-label="Create a new note"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Note
            </Button>
          </div>
        ) : (
          <div className="notes-grid grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3" role="group" aria-labelledby="notes-section-title">
            {otherNotes.map((note) => (
              <NoteListItem
                key={note.title}
                note={note}
                isSelected={selectedIdsSet.has(note.title)}
                isSelectionMode={isSelectionMode}
                onNoteClick={onNoteClick}
                onSelectionToggle={handleNoteSelectionToggle}
                isActive={note.id === activeNoteId}
                onDelete={handleNoteDelete}
                onCollectionUpdate={onCollectionUpdate}
                allNotes={allNotes}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-2">Delete Notes</h2>
            <p className="text-text-secondary mb-4">
              Are you sure you want to delete {selectedIds.length} note{selectedIds.length !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={isLoadingBulkOperation}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isLoadingBulkOperation}
              >
                {isLoadingBulkOperation ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectableNotesList;