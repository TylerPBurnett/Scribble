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

// Mock NoteCard component
vi.mock('../NoteCard', () => ({
  default: ({ note, onClick, isActive, onDelete }: any) => (
    <div
      data-testid={`note-card-${note.title}`}
      onClick={() => onClick(note)}
      className={isActive ? 'active' : ''}
    >
      <span>{note.title}</span>
      <button onClick={() => onDelete(note.id)} data-testid={`delete-${note.title}`}>
        Delete
      </button>
    </div>
  ),
}));

describe('SelectableNotesList Accessibility Tests', () => {
  const mockNotes: Note[] = [
    {
      id: '1',
      title: 'Test Note 1',
      content: 'Content 1',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      favorite: false,
    },
    {
      id: '2',
      title: 'Test Note 2',
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Attributes and Screen Reader Compatibility (Requirements 5.3, 5.4, 5.5, 5.6)', () => {
    it('should have proper ARIA labels on all buttons in default mode', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Select button should have proper aria-label
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      expect(selectButton).toHaveAttribute('aria-label', 'Enter selection mode to select multiple notes');

      // Sort button should have proper aria attributes
      const sortButton = screen.getByRole('button', { name: /sort notes/i });
      expect(sortButton).toHaveAttribute('aria-expanded', 'false');
      expect(sortButton).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('should have proper ARIA labels on all buttons in selection mode', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Selection toolbar should have proper role and label
        const toolbar = screen.getByRole('toolbar', { name: /selection controls/i });
        expect(toolbar).toBeInTheDocument();

        // All selection buttons should have proper aria-labels
        expect(screen.getByRole('button', { name: /select all notes/i })).toHaveAttribute('aria-label', 'Select all notes');
        expect(screen.getByRole('button', { name: /deselect all notes/i })).toHaveAttribute('aria-label', 'Deselect all notes');
        expect(screen.getByRole('button', { name: /cancel selection mode/i })).toHaveAttribute('aria-label', 'Cancel selection mode');
      });
    });

    it('should have proper ARIA labels on checkboxes with note titles', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Each checkbox should have proper aria-label with note title
        expect(screen.getByRole('checkbox', { name: /select note: test note 1/i }))
          .toHaveAttribute('aria-label', 'Select note: Test Note 1');
        expect(screen.getByRole('checkbox', { name: /select note: test note 2/i }))
          .toHaveAttribute('aria-label', 'Select note: Test Note 2');
        expect(screen.getByRole('checkbox', { name: /select note: favorite note/i }))
          .toHaveAttribute('aria-label', 'Select note: Favorite Note');
      });
    });

    it('should use role="group" and aria-labelledby for notes lists', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Notes section should have proper group role and labelledby
      const notesGroup = screen.getByRole('group', { name: /notes/i });
      expect(notesGroup).toHaveAttribute('aria-labelledby', 'notes-section-title');

      // Favorites section should also have proper group role and labelledby
      const favoritesGroup = screen.getByRole('group', { name: /favorites/i });
      expect(favoritesGroup).toHaveAttribute('aria-labelledby', 'favorites-section-title');
    });

    it('should use aria-hidden="true" for elements hidden outside selection mode', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Sort button container should have aria-hidden when in selection mode
        const sortContainer = screen.getByRole('button', { name: /sort notes/i }).parentElement;
        expect(sortContainer).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should announce selection changes to screen readers with aria-live', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Select a note
        const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        // Selection feedback should have aria-live="polite"
        const selectionFeedback = screen.getByText(/selected:\s*1\s*notes/i);
        expect(selectionFeedback).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have proper checkbox states (aria-checked)', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // All checkboxes should start unchecked
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('aria-checked', 'false');
        });
      });

      // Select a note
      const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('should have proper sort menu accessibility attributes', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Open sort menu
      const sortButton = screen.getByRole('button', { name: /sort notes/i });
      fireEvent.click(sortButton);

      // Sort menu should have proper role and label
      const sortMenu = screen.getByRole('menu', { name: /sort options/i });
      expect(sortMenu).toBeInTheDocument();

      // All menu items should have proper role and labels
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBeGreaterThan(0);
      
      menuItems.forEach(item => {
        expect(item).toHaveAttribute('role', 'menuitem');
        expect(item).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Keyboard Navigation and Focus Management (Requirements 5.1, 5.2)', () => {
    it('should support tab navigation for all interactive elements', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // All interactive elements should be focusable with tab
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      const sortButton = screen.getByRole('button', { name: /sort notes/i });

      expect(selectButton).toHaveAttribute('tabIndex', '0');
      expect(sortButton).toHaveAttribute('tabIndex', '0');
    });

    it('should support tab navigation in selection mode', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // All selection controls should be focusable
        const selectAllButton = screen.getByRole('button', { name: /select all notes/i });
        const deselectAllButton = screen.getByRole('button', { name: /deselect all notes/i });
        const cancelButton = screen.getByRole('button', { name: /cancel selection mode/i });

        expect(selectAllButton).toHaveAttribute('tabIndex', '0');
        expect(deselectAllButton).toHaveAttribute('tabIndex', '0');
        expect(cancelButton).toHaveAttribute('tabIndex', '0');

        // Checkboxes should be focusable
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('tabIndex', '0');
        });

        // Sort button should be excluded from tab order in selection mode
        const sortButton = screen.getByRole('button', { name: /sort notes/i });
        expect(sortButton).toHaveAttribute('tabIndex', '-1');
      });
    });

    it('should support space and enter keys for checkbox toggling', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });
        expect(checkbox).toHaveAttribute('aria-checked', 'false');

        // Test space key
        fireEvent.keyDown(checkbox, { key: ' ' });
      });

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });
        expect(checkbox).toHaveAttribute('aria-checked', 'true');

        // Test enter key to toggle back
        fireEvent.keyDown(checkbox, { key: 'Enter' });
      });

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });
        expect(checkbox).toHaveAttribute('aria-checked', 'false');
      });
    });

    it('should support escape key to exit selection mode', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();
      });

      // Press escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        // Should exit selection mode
        expect(screen.getByRole('button', { name: /enter selection mode to select multiple notes/i })).toBeInTheDocument();
        expect(screen.queryByRole('toolbar', { name: /selection controls/i })).not.toBeInTheDocument();
      });
    });

    it('should support keyboard navigation for buttons', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Test Select button with Enter key
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.keyDown(selectButton, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();
      });

      // Test Cancel button with Enter key
      const cancelButton = screen.getByRole('button', { name: /cancel selection mode/i });
      fireEvent.keyDown(cancelButton, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enter selection mode to select multiple notes/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation for sort menu', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Open sort menu with keyboard
      const sortButton = screen.getByRole('button', { name: /sort notes/i });
      fireEvent.keyDown(sortButton, { key: 'Enter' });

      // Menu should be open
      const sortMenu = screen.getByRole('menu', { name: /sort options/i });
      expect(sortMenu).toBeInTheDocument();

      // Menu items should be focusable
      const menuItems = screen.getAllByRole('menuitem');
      menuItems.forEach(item => {
        expect(item).toHaveAttribute('tabIndex', '0');
      });

      // Test activating menu item with keyboard
      const titleZAItem = screen.getByRole('menuitem', { name: /sort by title z to a/i });
      fireEvent.keyDown(titleZAItem, { key: 'Enter' });

      // Menu should close
      expect(screen.queryByRole('menu', { name: /sort options/i })).not.toBeInTheDocument();
    });

    it('should maintain focus management during mode transitions', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Focus the Select button
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      selectButton.focus();
      expect(document.activeElement).toBe(selectButton);

      // Enter selection mode
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Focus should move to one of the selection controls
        const toolbar = screen.getByRole('toolbar', { name: /selection controls/i });
        expect(toolbar).toBeInTheDocument();
      });
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce selection count changes', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Select multiple notes
        const checkbox1 = screen.getByRole('checkbox', { name: /select note: test note 1/i });
        const checkbox2 = screen.getByRole('checkbox', { name: /select note: test note 2/i });
        
        fireEvent.click(checkbox1);
        fireEvent.click(checkbox2);
      });

      await waitFor(() => {
        // Should announce the selection count
        const announcement = screen.getByText(/selected:\s*2\s*notes/i);
        expect(announcement).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should not announce when no selections are made', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Should not show selection count when nothing is selected
        expect(screen.queryByText(/selected:/i)).not.toBeInTheDocument();
      });
    });

    it('should announce when all notes are selected', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Get the toolbar to avoid multiple matches
        const toolbar = screen.getByRole('toolbar', { name: /selection controls/i });
        const selectAllButton = toolbar.querySelector('button[aria-label="Select all notes"]') as HTMLElement;
        fireEvent.click(selectAllButton);
      });

      await waitFor(() => {
        // Should announce all notes selected
        const announcement = screen.getByText(/selected:\s*3\s*notes/i);
        expect(announcement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Accessibility with Empty States', () => {
    it('should handle empty notes list accessibility', () => {
      render(<SelectableNotesList {...defaultProps} notes={[]} />);

      // Should show "No notes available" message
      expect(screen.getByText(/no notes available/i)).toBeInTheDocument();

      // Should not show Select button when empty
      expect(screen.queryByRole('button', { name: /enter selection mode/i })).not.toBeInTheDocument();

      // Sort button should still be accessible
      const sortButton = screen.getByRole('button', { name: /sort notes/i });
      expect(sortButton).toHaveAttribute('tabIndex', '0');
    });

    it('should handle accessibility when selection is disabled', () => {
      render(<SelectableNotesList {...defaultProps} enableSelection={false} />);

      // Should not show Select button
      expect(screen.queryByRole('button', { name: /enter selection mode/i })).not.toBeInTheDocument();

      // Other elements should still be accessible
      const sortButton = screen.getByRole('button', { name: /sort notes/i });
      expect(sortButton).toHaveAttribute('tabIndex', '0');
    });

    it('should maintain accessibility in selection mode with empty list', async () => {
      const { rerender } = render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();
      });

      // Update to empty notes list
      rerender(<SelectableNotesList {...defaultProps} notes={[]} />);

      await waitFor(() => {
        // Should still show selection controls with proper accessibility
        const toolbar = screen.getByRole('toolbar', { name: /selection controls/i });
        expect(toolbar).toBeInTheDocument();

        // Buttons should still be accessible - use toolbar to avoid multiple matches
        expect(toolbar.querySelector('button[aria-label="Select all notes"]')).toHaveAttribute('tabIndex', '0');
        expect(toolbar.querySelector('button[aria-label="Deselect all notes"]')).toHaveAttribute('tabIndex', '0');
        expect(toolbar.querySelector('button[aria-label="Cancel selection mode"]')).toHaveAttribute('tabIndex', '0');

        // Should show "No notes available" message
        expect(screen.getByText(/no notes available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complex Accessibility Scenarios', () => {
    it('should handle accessibility with mixed favorite and regular notes', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Both sections should have proper group roles
      const favoritesGroup = screen.getByRole('group', { name: /favorites/i });
      const notesGroup = screen.getByRole('group', { name: /notes/i });

      expect(favoritesGroup).toHaveAttribute('aria-labelledby', 'favorites-section-title');
      expect(notesGroup).toHaveAttribute('aria-labelledby', 'notes-section-title');
    });

    it('should maintain accessibility during dynamic note changes', async () => {
      const { rerender } = render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode and select notes
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });
        fireEvent.click(checkbox);
      });

      // Remove a note from the list
      const updatedNotes = mockNotes.slice(1); // Remove first note
      rerender(<SelectableNotesList {...defaultProps} notes={updatedNotes} />);

      await waitFor(() => {
        // Remaining checkboxes should still have proper accessibility
        const remainingCheckboxes = screen.getAllByRole('checkbox');
        remainingCheckboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('aria-label');
          expect(checkbox).toHaveAttribute('aria-checked');
          expect(checkbox).toHaveAttribute('tabIndex', '0');
        });
      });
    });

    it('should handle accessibility with long note titles', async () => {
      const longTitleNotes: Note[] = [
        {
          id: '1',
          title: 'This is a very long note title that might cause accessibility issues if not handled properly',
          content: 'Content',
          createdAt: new Date(),
          updatedAt: new Date(),
          favorite: false,
        },
      ];

      render(<SelectableNotesList {...defaultProps} notes={longTitleNotes} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode to select multiple notes/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        // Checkbox should have proper aria-label even with long title
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toHaveAttribute('aria-label', 'Select note: This is a very long note title that might cause accessibility issues if not handled properly');
      });
    });
  });
});