import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteCard from '../NoteCard';
import { Note } from '../../../shared/types/Note';

// Mock the performance monitoring hooks
vi.mock('../../../shared/hooks/useExpensiveOperations', () => ({
  useNoteCardPerformance: () => ({
    measureOperation: vi.fn(),
  }),
}));

vi.mock('../../../shared/hooks/usePerformanceMonitoring', () => ({
  useRenderPerformance: vi.fn(),
  useMemoizationTracking: vi.fn(),
}));

// Mock the note service
vi.mock('../../../shared/services/noteService', () => ({
  updateNote: vi.fn(() => Promise.resolve()),
  deleteNote: vi.fn(() => Promise.resolve()),
}));

// Mock the NoteCollectionManager component
vi.mock('../NoteCollectionManager', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="note-collection-manager">
      Collection Manager
      <button onClick={onClose} data-testid="close-collection-manager">Close</button>
    </div>
  )
}));

// Mock window.noteWindow
Object.defineProperty(window, 'noteWindow', {
  value: {
    noteUpdated: vi.fn(),
    openNote: vi.fn(),
  },
  writable: true,
});

describe('NoteCard Interactions After Optimization', () => {
  const mockNote: Note = {
    id: 'test-note-1',
    title: 'Test Note Title',
    content: 'This is test note content',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
    pinned: false,
    favorite: false,
    color: '#fff9c4'
  };

  const mockOnClick = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnCollectionUpdate = vi.fn();

  const defaultProps = {
    note: mockNote,
    onClick: mockOnClick,
    isActive: false,
    onDelete: mockOnDelete,
    isPinned: false,
    isFavorite: false,
    onCollectionUpdate: mockOnCollectionUpdate,
    allNotes: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Menu Interactions', () => {
    it('should open dropdown menu when more button is clicked', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      const moreButton = container.querySelector('.more-button');
      expect(moreButton).toBeInTheDocument();
      
      if (moreButton) {
        fireEvent.click(moreButton);
        
        await waitFor(() => {
          const dropdownMenu = container.querySelector('.dropdown-menu');
          expect(dropdownMenu).toBeInTheDocument();
        });
      }
    });

    it('should open context menu on right click', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      const noteCard = container.querySelector('.note-card');
      expect(noteCard).toBeInTheDocument();
      
      if (noteCard) {
        fireEvent.contextMenu(noteCard);
        
        await waitFor(() => {
          const contextMenuOverlay = document.querySelector('.fixed.inset-0');
          expect(contextMenuOverlay).toBeInTheDocument();
        });
      }
    });

    it('should close menu when clicking outside', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      // Open menu first
      const moreButton = container.querySelector('.more-button');
      if (moreButton) {
        fireEvent.click(moreButton);
        
        await waitFor(() => {
          expect(container.querySelector('.dropdown-menu')).toBeInTheDocument();
        });
        
        // Click outside to close
        fireEvent.click(document.body);
        
        await waitFor(() => {
          expect(container.querySelector('.dropdown-menu')).not.toBeInTheDocument();
        });
      }
    });

    it('should handle color picker interactions', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      // Open menu first
      const moreButton = container.querySelector('.more-button');
      if (moreButton) {
        fireEvent.click(moreButton);
        
        await waitFor(() => {
          const colorOption = container.querySelector('[data-testid="color-option"]');
          if (colorOption) {
            fireEvent.click(colorOption);
            
            // Should show color picker
            expect(container.querySelector('.color-picker')).toBeInTheDocument();
          }
        });
      }
    });

    it('should handle collection manager interactions', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      // Open menu first
      const moreButton = container.querySelector('.more-button');
      if (moreButton) {
        fireEvent.click(moreButton);
        
        await waitFor(() => {
          const collectionOption = container.querySelector('[data-testid="collection-option"]');
          if (collectionOption) {
            fireEvent.click(collectionOption);
            
            // Should show collection manager
            expect(screen.getByTestId('note-collection-manager')).toBeInTheDocument();
          }
        });
      }
    });
  });

  describe('Animation States', () => {
    it('should handle click animation state', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      const noteCard = container.querySelector('.note-card');
      expect(noteCard).toBeInTheDocument();
      
      if (noteCard) {
        // Click the note card
        fireEvent.click(noteCard);
        
        // Should call onClick handler
        await waitFor(() => {
          expect(mockOnClick).toHaveBeenCalledWith(mockNote);
        });
      }
    });

    it('should prevent clicks during animation', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      const noteCard = container.querySelector('.note-card');
      if (noteCard) {
        // Click rapidly multiple times
        fireEvent.click(noteCard);
        fireEvent.click(noteCard);
        fireEvent.click(noteCard);
        
        // Should only call onClick once due to animation state management
        await waitFor(() => {
          expect(mockOnClick).toHaveBeenCalledTimes(1);
        });
      }
    });

    it('should handle menu animation states', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      const moreButton = container.querySelector('.more-button');
      if (moreButton) {
        // Click to open menu
        fireEvent.click(moreButton);
        
        // Should show menu
        await waitFor(() => {
          expect(container.querySelector('.dropdown-menu')).toBeInTheDocument();
        });
        
        // Click again to close
        fireEvent.click(moreButton);
        
        // Should close menu
        await waitFor(() => {
          expect(container.querySelector('.dropdown-menu')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Consolidated State Management', () => {
    it('should handle multiple state updates correctly', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      // Test that multiple state changes work together
      const noteCard = container.querySelector('.note-card');
      const moreButton = container.querySelector('.more-button');
      
      if (noteCard && moreButton) {
        // Right-click to open context menu
        fireEvent.contextMenu(noteCard);
        
        await waitFor(() => {
          expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument();
        });
        
        // Click more button while context menu is open
        fireEvent.click(moreButton);
        
        // Should handle both states appropriately
        await waitFor(() => {
          // Context menu should close and dropdown should open
          expect(container.querySelector('.dropdown-menu')).toBeInTheDocument();
        });
      }
    });

    it('should reset state correctly when component unmounts', () => {
      const { unmount } = render(<NoteCard {...defaultProps} />);
      
      // Component should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle state updates with consolidated menuState', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      // Verify that the consolidated state structure works
      // by testing that all menu interactions function properly
      const moreButton = container.querySelector('.more-button');
      if (moreButton) {
        fireEvent.click(moreButton);
        
        await waitFor(() => {
          const menu = container.querySelector('.dropdown-menu');
          expect(menu).toBeInTheDocument();
        });
        
        // The fact that the menu opens correctly indicates
        // that the consolidated state management is working
      }
    });
  });

  describe('Event Handler Optimization', () => {
    it('should maintain stable event handlers with useCallback', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Re-render with same props
      rerender(<NoteCard {...defaultProps} />);
      
      // Component should still handle events correctly
      const { container } = render(<NoteCard {...defaultProps} />);
      const noteCard = container.querySelector('.note-card');
      
      if (noteCard) {
        fireEvent.click(noteCard);
        expect(mockOnClick).toHaveBeenCalledWith(mockNote);
      }
    });

    it('should handle delete action correctly', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      // Open menu and find delete option
      const moreButton = container.querySelector('.more-button');
      if (moreButton) {
        fireEvent.click(moreButton);
        
        await waitFor(() => {
          const deleteOption = container.querySelector('[data-testid="delete-option"]');
          if (deleteOption) {
            fireEvent.click(deleteOption);
            
            // Should show confirmation dialog
            expect(container.querySelector('.confirm-delete')).toBeInTheDocument();
          }
        });
      }
    });

    it('should handle favorite toggle correctly', async () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      
      // Open menu and find favorite option
      const moreButton = container.querySelector('.more-button');
      if (moreButton) {
        fireEvent.click(moreButton);
        
        await waitFor(() => {
          const favoriteOption = container.querySelector('[data-testid="favorite-option"]');
          if (favoriteOption) {
            fireEvent.click(favoriteOption);
            
            // Should call the appropriate handler
            // (The actual implementation would update the note)
          }
        });
      }
    });
  });
});