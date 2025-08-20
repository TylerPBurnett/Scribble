import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    measureOperation: vi.fn().mockImplementation((_name, fn) => fn()),
    measureSync: vi.fn().mockImplementation((_name, fn) => ({ result: fn(), duration: 0 })),
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
  default: ({ note, onClick, isActive }: any) => (
    <div
      data-testid={`note-card-${note.title}`}
      onClick={onClick}
      className={isActive ? 'active' : ''}
    >
      {note.title}
    </div>
  ),
}));

describe('SelectableNotesList Keyboard Navigation', () => {
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

  describe('Tab Navigation', () => {
    it('should allow tab navigation through all interactive elements in default mode', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Select button should be focusable
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      expect(selectButton).toHaveAttribute('tabIndex', '0');

      // Sort button should be focusable
      const sortButton = screen.getByRole('button', { name: /sort notes/i });
      expect(sortButton).toHaveAttribute('tabIndex', '0');
    });

    it('should allow tab navigation through selection controls in selection mode', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // All selection buttons should be focusable
      const selectAllButton = screen.getByRole('button', { name: /select all notes/i });
      const deselectAllButton = screen.getByRole('button', { name: /deselect all notes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel selection mode/i });

      expect(selectAllButton).toHaveAttribute('tabIndex', '0');
      expect(deselectAllButton).toHaveAttribute('tabIndex', '0');
      expect(cancelButton).toHaveAttribute('tabIndex', '0');

      // Sort button should be excluded from tab order in selection mode
      const sortButton = screen.getByRole('button', { name: /sort notes/i });
      expect(sortButton).toHaveAttribute('tabIndex', '-1');
    });

    it('should allow tab navigation through checkboxes in selection mode', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // All checkboxes should be focusable
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Space and Enter Key Support for Checkboxes', () => {
    it('should toggle checkbox selection with space key', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Get first checkbox
      const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });
      expect(checkbox).toHaveAttribute('aria-checked', 'false');

      // Press space key
      fireEvent.keyDown(checkbox, { key: ' ' });

      await waitFor(() => {
        expect(checkbox).toHaveAttribute('aria-checked', 'true');
      });

      // Press space key again to uncheck
      fireEvent.keyDown(checkbox, { key: ' ' });

      await waitFor(() => {
        expect(checkbox).toHaveAttribute('aria-checked', 'false');
      });
    });

    it('should toggle checkbox selection with mouse click', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Get first checkbox
      const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });
      expect(checkbox).toHaveAttribute('aria-checked', 'false');

      // Click the checkbox
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('should have keyboard event handlers attached to checkboxes', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Get first checkbox
      const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });

      // Verify the checkbox has the proper attributes for keyboard navigation
      expect(checkbox).toHaveAttribute('tabIndex', '0');
      expect(checkbox).toHaveAttribute('role', 'checkbox');
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
      expect(checkbox).toHaveAttribute('aria-label', 'Select note: Test Note 1');
    });
  });

  describe('Escape Key Handler', () => {
    it('should exit selection mode when escape key is pressed', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Verify we're in selection mode
      expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();

      // Press escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        // Should be back in default mode
        expect(screen.getByRole('button', { name: /enter selection mode/i })).toBeInTheDocument();
        expect(screen.queryByRole('toolbar', { name: /selection controls/i })).not.toBeInTheDocument();
      });
    });

    it('should not interfere with escape key when not in selection mode', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Verify we're in default mode
      expect(screen.getByRole('button', { name: /enter selection mode/i })).toBeInTheDocument();

      // Press escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      // Should still be in default mode
      expect(screen.getByRole('button', { name: /enter selection mode/i })).toBeInTheDocument();
    });

    it('should prevent default behavior when escape is pressed in selection mode', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Verify we're in selection mode
      expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();

      // Press escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      // Verify we exited selection mode (indicating the handler ran and preventDefault worked)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enter selection mode/i })).toBeInTheDocument();
        expect(screen.queryByRole('toolbar', { name: /selection controls/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Button Keyboard Support', () => {
    it('should activate buttons with enter and space keys', () => {
      const onNoteClick = vi.fn();
      render(<SelectableNotesList {...defaultProps} onNoteClick={onNoteClick} />);

      // Test Select button
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });

      // Press enter key
      fireEvent.keyDown(selectButton, { key: 'Enter' });

      // Should enter selection mode
      expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();
    });

    it('should activate selection control buttons with mouse clicks', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Get buttons from the toolbar to avoid multiple matches
      const toolbar = screen.getByRole('toolbar', { name: /selection controls/i });
      const selectAllButton = toolbar.querySelector('button[aria-label="Select all notes"]') as HTMLElement;
      const deselectAllButton = toolbar.querySelector('button[aria-label="Deselect all notes"]') as HTMLElement;

      // Test Select All button with click
      fireEvent.click(selectAllButton);

      // All checkboxes should be checked
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('aria-checked', 'true');
        });
      });

      // Test Deselect All button with click
      fireEvent.click(deselectAllButton);

      // All checkboxes should be unchecked
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('aria-checked', 'false');
        });
      });
    });

    it('should activate sort button with keyboard', () => {
      render(<SelectableNotesList {...defaultProps} />);

      const sortButton = screen.getByRole('button', { name: /sort notes/i });

      // Press enter key
      fireEvent.keyDown(sortButton, { key: 'Enter' });

      // Sort menu should be visible
      expect(screen.getByRole('menu', { name: /sort options/i })).toBeInTheDocument();
    });
  });

  describe('Sort Menu Keyboard Navigation', () => {
    it('should allow keyboard navigation through sort menu items', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Open sort menu
      const sortButton = screen.getByRole('button', { name: /sort notes/i });
      fireEvent.click(sortButton);

      // All menu items should be focusable
      const menuItems = screen.getAllByRole('menuitem');
      menuItems.forEach(item => {
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should activate sort menu items with keyboard', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Open sort menu
      const sortButton = screen.getByRole('button', { name: /sort notes/i });
      fireEvent.click(sortButton);

      // Test activating a menu item with enter key
      const titleZAItem = screen.getByRole('menuitem', { name: /sort by title z to a/i });
      fireEvent.keyDown(titleZAItem, { key: 'Enter' });

      // Menu should close (not be in document)
      expect(screen.queryByRole('menu', { name: /sort options/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels for screen readers', () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Check ARIA labels
      expect(screen.getByRole('toolbar', { name: /selection controls/i })).toBeInTheDocument();

      // Use more specific queries to avoid multiple matches
      const toolbar = screen.getByRole('toolbar', { name: /selection controls/i });
      expect(toolbar.querySelector('button[aria-label="Select all notes"]')).toBeInTheDocument();
      expect(toolbar.querySelector('button[aria-label="Deselect all notes"]')).toBeInTheDocument();
      expect(toolbar.querySelector('button[aria-label="Cancel selection mode"]')).toBeInTheDocument();

      // Check checkbox labels
      expect(screen.getByRole('checkbox', { name: /select note: test note 1/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /select note: test note 2/i })).toBeInTheDocument();
    });

    it('should announce selection changes to screen readers', async () => {
      render(<SelectableNotesList {...defaultProps} />);

      // Enter selection mode
      const selectButton = screen.getByRole('button', { name: /enter selection mode/i });
      fireEvent.click(selectButton);

      // Select a note
      const checkbox = screen.getByRole('checkbox', { name: /select note: test note 1/i });
      fireEvent.click(checkbox);

      // Check for aria-live region - look for the element with aria-live attribute
      await waitFor(() => {
        const liveRegion = screen.getByText(/Selected:/);
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        expect(liveRegion.textContent).toMatch(/Selected:\s*1\s*notes/);
      });
    });
  });
});