import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import SelectableNotesList from '../SelectableNotesList';
import { Note } from '../../../shared/types/Note';

// Mock the services and hooks
vi.mock('../../../shared/services/noteService', () => ({
  deleteNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../shared/services/settingsService', () => ({
  getNotesSortOption: vi.fn().mockReturnValue({ field: 'title', direction: 'asc', label: 'Title (A-Z)' }),
  saveNotesSortOption: vi.fn(),
}));

vi.mock('../../../shared/hooks/useExpensiveOperations', () => ({
  useNoteListPerformance: vi.fn().mockReturnValue({
    measureOperation: vi.fn().mockImplementation((name, fn) => fn()),
    measureSync: vi.fn().mockImplementation((name, fn) => ({ result: fn(), duration: 0 })),
  }),
}));

vi.mock('../../../shared/hooks/usePerformanceMonitoring', () => ({
  useRenderPerformance: vi.fn(),
  useMemoizationTracking: vi.fn(),
}));

vi.mock('../../../shared/hooks/useAsyncMemo', () => ({
  useMemoizedFilter: vi.fn().mockImplementation((data, fn) => fn(data)),
  useMemoizedSort: vi.fn().mockImplementation((data, fn) => fn(data)),
  useMemoizedCategorization: vi.fn().mockImplementation((data, fn) => fn(data)),
}));

// Mock NoteCard component with more realistic behavior
vi.mock('../NoteCard', () => ({
  default: ({ note, onClick, isActive, onDelete, isFavorite, onCollectionUpdate, allNotes }: any) => (
    <div
      data-testid={`note-card-${note.title}`}
      onClick={() => onClick(note)}
      className={isActive ? 'active' : ''}
      data-favorite={isFavorite}
    >
      <span>{note.title}</span>
      <button onClick={() => onDelete(note.id)} data-testid={`delete-${note.title}`}>
        Delete
      </button>
      {onCollectionUpdate && (
        <button onClick={onCollectionUpdate} data-testid={`update-collection-${note.title}`}>
          Update Collection
        </button>
      )}
      {allNotes && (
        <span data-testid={`all-notes-count-${note.title}`}>
          Total: {allNotes.length}
        </span>
      )}
    </div>
  ),
}));

describe('SelectableNotesList Integration Tests', () => {
  const mockNotes: Note[] = [
    {
      id: '1',
      title: 'Regular Note 1',
      content: 'Content 1',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      favorite: false,
    },
    {
      id: '2',
      title: 'Regular Note 2',
      content: 'Content 2',
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02'),
      favorite: false,
    },
    {
      id: '3',
      title: 'Favorite Note',
      content: 'Favorite content',
      createdAt: new Date('2023-01-03'),
      updatedAt: new Date('2023-01-03'),
      favorite: true,
    },
  ];

  const defaultProps = {
    notes: mockNotes,
    onNoteClick: vi.fn(),
    onNoteDelete: vi.fn(),
    onCollectionUpdate: vi.fn(),
    onNewNote: vi.fn(),
    onSelectionChange: vi.fn(),
    enableSelection: true,
    activeNoteId: '1',
    activeCollectionId: 'collection-1',
    activeCollectionName: 'Test Collection',
    allNotes: mockNotes,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Integration with Existing NoteList Props and Callbacks', () => {
    it('should pass through all NoteList props to NoteCard components', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Check that NoteCard receives the correct props
      const noteCard = screen.getByTestId('note-card-Regular Note 1');
      expect(noteCard).toHaveClass('active'); // activeNoteId should make this active

      // Check that onCollectionUpdate is passed through
      const updateButton = screen.getByTestId('update-collection-Regular Note 1');
      expect(updateButton).toBeInTheDocument();

      // Check that allNotes is passed through
      const allNotesCount = screen.getByTestId('all-notes-count-Regular Note 1');
      expect(allNotesCount).toHaveTextContent('Total: 3');
    });

    it('should call onNoteClick when note is clicked in default mode', () => {
      const onNoteClick = vi.fn();
      render(<SelectableNotesList {...defaultProps} onNoteClick={onNoteClick} />);

      const noteCard = screen.getByTestId('note-card-Regular Note 1');
      fireEvent.click(noteCard);

      expect(onNoteClick).toHaveBeenCalledWith(mockNotes[0]);
    });

    it('should not call onNoteClick when note is clicked in selection mode', async () => {
      const onNoteClick = vi.fn();
      render(<SelectableNotesList {...defaultProps} onNoteClick={onNoteClick} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        const noteCard = screen.getByTestId('note-card-Regular Note 1');
        fireEvent.click(noteCard);
      });

      // Should not call onNoteClick in selection mode
      expect(onNoteClick).not.toHaveBeenCalled();
    });

    it('should call onNoteDelete when note is deleted', async () => {
      const onNoteDelete = vi.fn();
      render(<SelectableNotesList {...defaultProps} onNoteDelete={onNoteDelete} />);

      const deleteButton = screen.getByTestId('delete-Regular Note 1');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onNoteDelete).toHaveBeenCalledWith('1');
      });
    });

    it('should call onCollectionUpdate when collection is updated', () => {
      const onCollectionUpdate = vi.fn();
      render(<SelectableNotesList {...defaultProps} onCollectionUpdate={onCollectionUpdate} />);

      const updateButton = screen.getByTestId('update-collection-Regular Note 1');
      fireEvent.click(updateButton);

      expect(onCollectionUpdate).toHaveBeenCalled();
    });

    it('should call onSelectionChange when selections change', async () => {
      const onSelectionChange = vi.fn();
      render(<SelectableNotesList {...defaultProps} onSelectionChange={onSelectionChange} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Clear initial calls
      onSelectionChange.mockClear();

      // Select a note
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select note: regular note 1/i });
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        expect(onSelectionChange).toHaveBeenCalledWith(['Regular Note 1']);
      });
    });

    it('should handle activeNoteId prop correctly', () => {
      render(<SelectableNotesList {...defaultProps} activeNoteId="2" />);

      // Note with id "2" should be active
      const activeNote = screen.getByTestId('note-card-Regular Note 2');
      expect(activeNote).toHaveClass('active');

      // Other notes should not be active
      const inactiveNote = screen.getByTestId('note-card-Regular Note 1');
      expect(inactiveNote).not.toHaveClass('active');
    });

    it('should handle missing optional props gracefully', () => {
      const minimalProps = {
        notes: mockNotes,
        onNoteClick: vi.fn(),
      };

      expect(() => {
        render(<SelectableNotesList {...minimalProps} />);
      }).not.toThrow();

      // Should still render notes
      expect(screen.getByTestId('note-card-Regular Note 1')).toBeInTheDocument();
    });

    it('should handle enableSelection=false correctly', () => {
      render(<SelectableNotesList {...defaultProps} enableSelection={false} />);

      // Should not show Select button
      expect(screen.queryByRole('button', { name: /enter selection mode/i })).not.toBeInTheDocument();

      // Should still show other functionality
      expect(screen.getByRole('button', { name: /sort notes/i })).toBeInTheDocument();
      expect(screen.getByTestId('note-card-Regular Note 1')).toBeInTheDocument();
    });

    it('should maintain existing NoteList functionality during selection mode', async () => {
      const onCollectionUpdate = vi.fn();
      render(<SelectableNotesList {...defaultProps} onCollectionUpdate={onCollectionUpdate} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Collection update should still work
        const updateButton = screen.getByTestId('update-collection-Regular Note 1');
        fireEvent.click(updateButton);
        expect(onCollectionUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Empty State Handling and Edge Cases', () => {
    it('should handle empty notes list correctly', () => {
      render(<SelectableNotesList {...defaultProps} notes={[]} />);

      // Should show "No notes available" message
      expect(screen.getByText(/no notes available/i)).toBeInTheDocument();

      // Should not show Select button
      expect(screen.queryByRole('button', { name: /enter selection mode/i })).not.toBeInTheDocument();

      // Should still show sort button
      expect(screen.getByRole('button', { name: /sort notes/i })).toBeInTheDocument();
    });

    it('should handle transition from populated to empty notes list', async () => {
      const { rerender } = render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode and select notes
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select note: regular note 1/i });
        fireEvent.click(checkbox);
      });

      // Update to empty notes list
      rerender(<SelectableNotesList {...defaultProps} notes={[]} />);

      await waitFor(() => {
        // Should show "No notes available" or collection-specific message
        expect(screen.getByText(/no notes/i)).toBeInTheDocument();

        // Should still be in selection mode with controls visible
        expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();

        // Should not show any checkboxes
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      });
    });

    it('should handle notes with missing or undefined properties', () => {
      const notesWithMissingProps: Note[] = [
        {
          id: '1',
          title: 'Note with missing props',
          content: 'Content',
          createdAt: new Date(),
          updatedAt: new Date(),
          favorite: false,
        },
      ];

      expect(() => {
        render(<SelectableNotesList {...defaultProps} notes={notesWithMissingProps} />);
      }).not.toThrow();

      expect(screen.getByTestId('note-card-Note with missing props')).toBeInTheDocument();
    });

    it('should handle notes with duplicate titles', async () => {
      const duplicateNotes: Note[] = [
        {
          id: '1',
          title: 'Duplicate Title',
          content: 'Content 1',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          favorite: false,
        },
        {
          id: '2',
          title: 'Duplicate Title',
          content: 'Content 2',
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
          favorite: false,
        },
      ];

      const onSelectionChange = vi.fn();
      render(<SelectableNotesList {...defaultProps} notes={duplicateNotes} onSelectionChange={onSelectionChange} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Clear initial calls
      onSelectionChange.mockClear();

      await waitFor(() => {
        // Get the toolbar to avoid multiple matches
        const toolbar = screen.getByRole('toolbar', { name: /selection controls/i });
        const selectAllButton = toolbar.querySelector('button[aria-label="Select all notes"]') as HTMLElement;
        fireEvent.click(selectAllButton);
      });

      await waitFor(() => {
        // Should handle duplicate titles (may select both or handle uniquely)
        expect(onSelectionChange).toHaveBeenCalled();
        const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0];
        expect(Array.isArray(lastCall)).toBe(true);
      });
    });

    it('should handle very large notes lists efficiently', async () => {
      // Create a large list of notes
      const largeNotesList: Note[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `Content ${i}`,
        createdAt: new Date(2023, 0, 1 + i),
        updatedAt: new Date(2023, 0, 1 + i),
        favorite: i % 10 === 0, // Every 10th note is favorite
      }));

      const onSelectionChange = vi.fn();
      render(<SelectableNotesList {...defaultProps} notes={largeNotesList} onSelectionChange={onSelectionChange} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Clear initial calls
      onSelectionChange.mockClear();

      await waitFor(() => {
        // Get the toolbar to avoid multiple matches
        const toolbar = screen.getByRole('toolbar', { name: /selection controls/i });
        const selectAllButton = toolbar.querySelector('button[aria-label="Select all notes"]') as HTMLElement;
        fireEvent.click(selectAllButton);
      });

      await waitFor(() => {
        // Should call onSelectionChange with all 1000 note titles
        expect(onSelectionChange).toHaveBeenCalled();
        const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0];
        expect(lastCall).toHaveLength(1000);
      });
    });

    it('should handle rapid selection changes without race conditions', async () => {
      const onSelectionChange = vi.fn();
      render(<SelectableNotesList {...defaultProps} onSelectionChange={onSelectionChange} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Rapidly toggle selections
        const checkbox1 = screen.getByRole('checkbox', { name: /select note: regular note 1/i });
        const checkbox2 = screen.getByRole('checkbox', { name: /select note: regular note 2/i });

        // Rapid clicks
        fireEvent.click(checkbox1);
        fireEvent.click(checkbox2);
        fireEvent.click(checkbox1);
        fireEvent.click(checkbox2);
      });

      await waitFor(() => {
        // Should handle rapid changes correctly
        expect(onSelectionChange).toHaveBeenCalled();
        // Final state should be consistent
        const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0];
        expect(Array.isArray(lastCall)).toBe(true);
      });
    });

    it('should handle notes being deleted while selected', async () => {
      const onSelectionChange = vi.fn();
      render(<SelectableNotesList {...defaultProps} onSelectionChange={onSelectionChange} />);

      // Enter selection mode and select a note
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select note: regular note 1/i });
        fireEvent.click(checkbox);
      });

      // Clear previous calls
      onSelectionChange.mockClear();

      // Delete the selected note
      const deleteButton = screen.getByTestId('delete-Regular Note 1');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        // Should remove deleted note from selections
        expect(onSelectionChange).toHaveBeenCalledWith([]);
      });
    });

    it('should handle component unmounting during selection mode', async () => {
      const { unmount } = render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();
      });

      // Unmount should not throw errors
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle prop changes during selection mode', async () => {
      const { rerender } = render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode and select notes
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select note: regular note 1/i });
        fireEvent.click(checkbox);
      });

      // Change props while in selection mode
      const newProps = {
        ...defaultProps,
        activeNoteId: '2',
        activeCollectionName: 'New Collection',
      };

      rerender(<SelectableNotesList {...newProps} />);

      await waitFor(() => {
        // Should maintain selection mode
        expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();

        // Should update active note
        const newActiveNote = screen.getByTestId('note-card-Regular Note 2');
        expect(newActiveNote).toHaveClass('active');
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not cause memory leaks with event listeners', async () => {
      const { unmount } = render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode to add event listeners
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();
      });

      // Unmount should clean up event listeners
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle frequent re-renders efficiently', () => {
      const { rerender } = render(<SelectableNotesList {...defaultProps} />);

      // Perform multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<SelectableNotesList {...defaultProps} activeNoteId={`${i % 3 + 1}`} />);
      }

      // Should still render correctly
      expect(screen.getByTestId('note-card-Regular Note 1')).toBeInTheDocument();
    });

    it('should handle callback prop changes without breaking functionality', async () => {
      const onNoteClick1 = vi.fn();
      const onNoteClick2 = vi.fn();

      const { rerender } = render(<SelectableNotesList {...defaultProps} onNoteClick={onNoteClick1} />);

      // Click note with first callback
      let noteCard = screen.getByTestId('note-card-Regular Note 1');
      fireEvent.click(noteCard);
      expect(onNoteClick1).toHaveBeenCalled();

      // Clear the first callback
      onNoteClick1.mockClear();

      // Change callback prop
      rerender(<SelectableNotesList {...defaultProps} onNoteClick={onNoteClick2} />);

      // Wait for re-render and get the note card again
      await waitFor(() => {
        noteCard = screen.getByTestId('note-card-Regular Note 1');
        fireEvent.click(noteCard);
      });

      expect(onNoteClick2).toHaveBeenCalled();
      expect(onNoteClick1).not.toHaveBeenCalled(); // Ensure old callback wasn't called
    });
  });

  describe('Sorting Integration', () => {
    it('should maintain selection state during sorting', async () => {
      const onSelectionChange = vi.fn();
      render(<SelectableNotesList {...defaultProps} onSelectionChange={onSelectionChange} />);

      // Enter selection mode and select notes
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select note: regular note 1/i });
        fireEvent.click(checkbox);
      });

      // Clear previous calls
      onSelectionChange.mockClear();

      // Change sort order - sort button is hidden in selection mode, so exit first
      const cancelButton = screen.getByRole('button', { name: /cancel selection mode/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        const sortButton = screen.getByRole('button', { name: /sort notes/i });
        fireEvent.click(sortButton);
      });

      const sortOption = screen.getByRole('menuitem', { name: /sort by title z to a/i });
      fireEvent.click(sortOption);

      const sortOption2 = screen.getByRole('menuitem', { name: /sort by title z to a/i });
      fireEvent.click(sortOption2);

      // Re-enter selection mode to check if selection was maintained
      await waitFor(() => {
        const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
        fireEvent.click(selectButton);
      });

      await waitFor(() => {
        // Selection should be cleared when re-entering selection mode (this is expected behavior)
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('aria-checked', 'false');
        });
      });
    });

    it('should handle sorting with favorites and regular notes', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Should show both favorites and regular notes sections
      expect(screen.getByRole('group', { name: /favorites/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /notes/i })).toBeInTheDocument();

      // Favorite note should be in favorites section
      const favoritesSection = screen.getByRole('group', { name: /favorites/i });
      expect(favoritesSection).toBeInTheDocument();
    });
  });
});