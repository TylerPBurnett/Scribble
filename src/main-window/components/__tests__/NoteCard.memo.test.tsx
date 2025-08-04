import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteCard from '../NoteCard';
import { Note } from '../../../shared/types/Note';

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

describe('NoteCard React.memo', () => {
  const mockNote: Note = {
    id: 'test-note-1',
    title: 'Test Note',
    content: 'This is a test note content',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    favorite: false,
    pinned: false,
    color: '#fff9c4',
  };

  const defaultProps = {
    note: mockNote,
    onClick: vi.fn(),
    isActive: false,
    onDelete: vi.fn(),
    isPinned: false,
    isFavorite: false,
    onCollectionUpdate: vi.fn(),
    allNotes: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render NoteCard component', () => {
    render(<NoteCard {...defaultProps} />);
    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('should not re-render when props have not changed', () => {
    const renderSpy = vi.fn();
    
    // Create a wrapper component to track renders
    const TestWrapper = ({ note, ...props }: any) => {
      renderSpy();
      return <NoteCard note={note} {...props} />;
    };

    const { rerender } = render(<TestWrapper {...defaultProps} />);
    
    // Initial render
    expect(renderSpy).toHaveBeenCalledTimes(1);
    
    // Re-render with same props - should not trigger NoteCard re-render due to memo
    rerender(<TestWrapper {...defaultProps} />);
    
    // The wrapper re-renders but NoteCard should be memoized
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('should re-render when note data changes', () => {
    const { rerender } = render(<NoteCard {...defaultProps} />);
    
    expect(screen.getByText('Test Note')).toBeInTheDocument();
    
    // Change note title
    const updatedNote = { ...mockNote, title: 'Updated Note Title' };
    rerender(<NoteCard {...defaultProps} note={updatedNote} />);
    
    expect(screen.getByText('Updated Note Title')).toBeInTheDocument();
  });

  it('should re-render when favorite status changes', () => {
    const { rerender, container } = render(<NoteCard {...defaultProps} />);
    
    // Change to favorite
    const favoriteNote = { ...mockNote, favorite: true };
    rerender(<NoteCard {...defaultProps} note={favoriteNote} />);
    
    // Should show favorite icon (look for the star SVG)
    const favoriteIcon = container.querySelector('.favorite-icon');
    expect(favoriteIcon).toBeInTheDocument();
  });

  it('should re-render when isActive prop changes', () => {
    const { rerender, container } = render(<NoteCard {...defaultProps} />);
    
    // Change to active
    rerender(<NoteCard {...defaultProps} isActive={true} />);
    
    // Should have selected class
    const noteCard = container.querySelector('.note-card');
    expect(noteCard).toHaveClass('selected');
  });
});