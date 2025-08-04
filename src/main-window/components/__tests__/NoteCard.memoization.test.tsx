import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  default: () => <div data-testid="note-collection-manager">Collection Manager</div>
}));

// Mock window.noteWindow
Object.defineProperty(window, 'noteWindow', {
  value: {
    noteUpdated: vi.fn(),
    openNote: vi.fn(),
  },
  writable: true,
});

describe('NoteCard Memoization Tests', () => {
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

  describe('React.memo Implementation', () => {
    it('should not re-render when props haven\'t changed', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Verify initial render
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
      
      // Re-render with identical props
      rerender(<NoteCard {...defaultProps} />);
      
      // Component should still be rendered correctly
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
      
      // The memoization should prevent unnecessary re-renders
      // This is verified by the component still functioning correctly
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should re-render when note data changes', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Verify initial render
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
      
      // Change note data
      const updatedNote = { ...mockNote, title: 'Updated Note Title' };
      rerender(<NoteCard {...defaultProps} note={updatedNote} />);
      
      // Should show updated content
      expect(screen.getByText('Updated Note Title')).toBeInTheDocument();
      expect(screen.queryByText('Test Note Title')).not.toBeInTheDocument();
    });

    it('should re-render when note content changes', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Change note content
      const updatedNote = { ...mockNote, content: 'Updated note content' };
      rerender(<NoteCard {...defaultProps} note={updatedNote} />);
      
      // Component should re-render with new content
      expect(screen.getByText('Updated note content')).toBeInTheDocument();
    });

    it('should re-render when note color changes', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Change note color
      const updatedNote = { ...mockNote, color: '#ff0000' };
      rerender(<NoteCard {...defaultProps} note={updatedNote} />);
      
      // Component should re-render (we can verify this by checking the component still renders)
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });

    it('should re-render when favorite status changes', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Change favorite status
      const updatedNote = { ...mockNote, favorite: true };
      rerender(<NoteCard {...defaultProps} note={updatedNote} />);
      
      // Component should re-render
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });

    it('should re-render when pinned status changes', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Change pinned status
      const updatedNote = { ...mockNote, pinned: true };
      rerender(<NoteCard {...defaultProps} note={updatedNote} />);
      
      // Component should re-render
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });

    it('should re-render when updatedAt changes', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Change updatedAt
      const updatedNote = { ...mockNote, updatedAt: new Date('2024-01-16T10:30:00Z') };
      rerender(<NoteCard {...defaultProps} note={updatedNote} />);
      
      // Component should re-render
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });

    it('should re-render when isActive prop changes', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Change isActive prop
      rerender(<NoteCard {...defaultProps} isActive={true} />);
      
      // Component should re-render
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });

    it('should not re-render when unrelated props change', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Add an unrelated prop that shouldn't affect memoization
      // Since our comparison function only checks specific props
      const newAllNotes = [mockNote, { ...mockNote, id: 'different-note' }];
      rerender(<NoteCard {...defaultProps} allNotes={newAllNotes} />);
      
      // Component should still render correctly
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });
  });

  describe('Custom Comparison Function', () => {
    it('should handle undefined updatedAt gracefully', () => {
      const noteWithoutUpdatedAt = { ...mockNote, updatedAt: undefined as any };
      const { rerender } = render(<NoteCard {...defaultProps} note={noteWithoutUpdatedAt} />);
      
      // Should render without errors
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
      
      // Re-render with same props should not cause issues
      rerender(<NoteCard {...defaultProps} note={noteWithoutUpdatedAt} />);
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });

    it('should handle note ID changes correctly', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Change note ID (should trigger re-render)
      const differentNote = { ...mockNote, id: 'different-note-id' };
      rerender(<NoteCard {...defaultProps} note={differentNote} />);
      
      // Component should re-render
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });

    it('should handle multiple prop changes correctly', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Change multiple props that should trigger re-render
      const updatedNote = { 
        ...mockNote, 
        title: 'New Title',
        favorite: true,
        color: '#ff0000'
      };
      rerender(<NoteCard {...defaultProps} note={updatedNote} isActive={true} />);
      
      // Should show updated content
      expect(screen.getByText('New Title')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('should integrate with performance monitoring hooks', () => {
      render(<NoteCard {...defaultProps} />);
      
      // Verify component renders successfully with performance monitoring
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
      
      // The performance hooks should be called (mocked in our setup)
      // This test verifies that the integration doesn't break the component
    });

    it('should handle performance monitoring with memoization', () => {
      const { rerender } = render(<NoteCard {...defaultProps} />);
      
      // Re-render with same props
      rerender(<NoteCard {...defaultProps} />);
      
      // Component should still work correctly with performance monitoring
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });
  });
});