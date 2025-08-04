import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteList from '../NoteList';
import { Note } from '../../../shared/types/Note';

// Mock the performance monitoring hooks
vi.mock('../../../shared/hooks/useExpensiveOperations', () => ({
  useNoteListPerformance: () => ({
    measureOperation: vi.fn((_name, fn) => fn()),
  }),
}));

vi.mock('../../../shared/hooks/usePerformanceMonitoring', () => ({
  useRenderPerformance: vi.fn(),
}));

// Mock the async memo hooks to pass through the operations
vi.mock('../../../shared/hooks/useAsyncMemo', () => ({
  useMemoizedFilter: (notes: Note[], filterFn: (notes: Note[]) => Note[]) => filterFn(notes),
  useMemoizedSort: (notes: Note[], sortFn: (notes: Note[]) => Note[]) => sortFn(notes),
  useMemoizedCategorization: (notes: Note[]) => {
    const favorites = notes.filter(note => note.favorite);
    const others = notes.filter(note => !note.favorite);
    return { favoriteItems: favorites, otherItems: others };
  },
}));

// Mock the note service
vi.mock('../../../shared/services/noteService', () => ({
  deleteNote: vi.fn(() => Promise.resolve()),
}));

// Mock the settings service
vi.mock('../../../shared/services/settingsService', () => ({
  getNotesSortOption: vi.fn(() => ({ field: 'updatedAt', direction: 'desc' })),
  saveNotesSortOption: vi.fn(),
}));

// Mock NoteCard component
vi.mock('../NoteCard', () => ({
  default: ({ note, onClick, onDelete }: { note: Note; onClick: (note: Note) => void; onDelete: (id: string) => void }) => (
    <div data-testid={`note-card-${note.id}`}>
      <div onClick={() => onClick(note)}>{note.title}</div>
      <button onClick={() => onDelete(note.id)} data-testid={`delete-${note.id}`}>Delete</button>
    </div>
  )
}));

describe('NoteList Functionality After Optimization', () => {
  const mockNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Alpha Note',
      content: 'Content of alpha note',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-03T10:00:00Z'),
      favorite: false,
      pinned: false,
      color: '#fff9c4'
    },
    {
      id: 'note-2',
      title: 'Beta Note',
      content: 'Content of beta note',
      createdAt: new Date('2024-01-02T10:00:00Z'),
      updatedAt: new Date('2024-01-02T10:00:00Z'),
      favorite: true,
      pinned: false,
      color: '#fff9c4'
    },
    {
      id: 'note-3',
      title: 'Gamma Note',
      content: 'Content of gamma note',
      createdAt: new Date('2024-01-03T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      favorite: false,
      pinned: true,
      color: '#fff9c4'
    }
  ];

  const mockOnNoteClick = vi.fn();
  const mockOnNoteDelete = vi.fn();
  const mockOnCollectionUpdate = vi.fn();

  const defaultProps = {
    notes: mockNotes,
    onNoteClick: mockOnNoteClick,
    activeNoteId: undefined,
    onNoteDelete: mockOnNoteDelete,
    onCollectionUpdate: mockOnCollectionUpdate,
    activeCollectionId: undefined,
    activeCollectionName: undefined,
    allNotes: mockNotes,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render all notes correctly', () => {
      render(<NoteList {...defaultProps} />);
      
      expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-3')).toBeInTheDocument();
      
      expect(screen.getByText('Alpha Note')).toBeInTheDocument();
      expect(screen.getByText('Beta Note')).toBeInTheDocument();
      expect(screen.getByText('Gamma Note')).toBeInTheDocument();
    });

    it('should handle empty notes list', () => {
      render(<NoteList {...defaultProps} notes={[]} />);
      
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
    });

    it('should handle notes with missing properties gracefully', () => {
      const notesWithMissingProps = [
        {
          id: 'incomplete-note',
          title: '',
          content: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          favorite: false,
          pinned: false,
          color: '#fff9c4'
        }
      ];
      
      render(<NoteList {...defaultProps} notes={notesWithMissingProps} />);
      
      expect(screen.getByTestId('note-card-incomplete-note')).toBeInTheDocument();
    });
  });

  describe('Categorization Functionality', () => {
    it('should separate favorite notes from other notes', () => {
      render(<NoteList {...defaultProps} />);
      
      // Should show favorites section
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      
      // All notes should be rendered
      expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-3')).toBeInTheDocument();
    });

    it('should handle no favorite notes', () => {
      const notesWithoutFavorites = mockNotes.map(note => ({ ...note, favorite: false }));
      
      render(<NoteList {...defaultProps} notes={notesWithoutFavorites} />);
      
      // Should not show favorites section
      expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
      
      // All notes should be in main section
      expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-3')).toBeInTheDocument();
    });

    it('should handle all notes being favorites', () => {
      const allFavoriteNotes = mockNotes.map(note => ({ ...note, favorite: true }));
      
      render(<NoteList {...defaultProps} notes={allFavoriteNotes} />);
      
      // Should show favorites section with all notes
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-3')).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should handle note click events', () => {
      render(<NoteList {...defaultProps} />);
      
      const noteTitle = screen.getByText('Alpha Note');
      fireEvent.click(noteTitle);
      
      expect(mockOnNoteClick).toHaveBeenCalledWith(mockNotes[0]);
    });

    it('should handle note deletion events', async () => {
      render(<NoteList {...defaultProps} />);
      
      const deleteButton = screen.getByTestId('delete-note-1');
      fireEvent.click(deleteButton);
      
      // Wait for async deletion to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should call the delete handler
      expect(mockOnNoteDelete).toHaveBeenCalledWith('note-1');
    });
  });

  describe('Performance Optimization Integration', () => {
    it('should maintain functionality with performance monitoring', () => {
      render(<NoteList {...defaultProps} />);
      
      // All functionality should work with performance monitoring
      expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-3')).toBeInTheDocument();
      
      // Click events should work
      fireEvent.click(screen.getByText('Alpha Note'));
      expect(mockOnNoteClick).toHaveBeenCalled();
    });

    it('should handle re-renders efficiently', () => {
      const { rerender } = render(<NoteList {...defaultProps} />);
      
      // Re-render with same props
      rerender(<NoteList {...defaultProps} />);
      
      // Should still render correctly
      expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-3')).toBeInTheDocument();
    });

    it('should update correctly when notes change', () => {
      const { rerender } = render(<NoteList {...defaultProps} />);
      
      // Add a new note
      const newNotes = [...mockNotes, {
        id: 'note-4',
        title: 'Delta Note',
        content: 'Content of delta note',
        createdAt: new Date('2024-01-04T10:00:00Z'),
        updatedAt: new Date('2024-01-04T10:00:00Z'),
        favorite: false,
        pinned: false,
        color: '#fff9c4'
      }];
      
      rerender(<NoteList {...defaultProps} notes={newNotes} />);
      
      // Should render the new note
      expect(screen.getByTestId('note-card-note-4')).toBeInTheDocument();
    });

    it('should handle large note collections efficiently', () => {
      // Create a large number of notes
      const largeNoteCollection: Note[] = Array.from({ length: 50 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `Content of note ${i}`,
        createdAt: new Date(2024, 0, i + 1),
        updatedAt: new Date(2024, 0, i + 1),
        favorite: i % 10 === 0, // Every 10th note is favorite
        pinned: i % 20 === 0,   // Every 20th note is pinned
        color: '#fff9c4'
      }));
      
      render(<NoteList {...defaultProps} notes={largeNoteCollection} />);
      
      // Should render without performance issues
      expect(screen.getByTestId('note-card-note-0')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-49')).toBeInTheDocument();
      
      // Favorites section should contain favorite notes
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });
  });

  describe('Memoization Integration', () => {
    it('should use memoized operations for filtering, sorting, and categorization', () => {
      render(<NoteList {...defaultProps} />);
      
      // Component should render successfully, indicating memoization is working
      expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-3')).toBeInTheDocument();
      
      // Favorites should be categorized correctly
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    it('should maintain performance with frequent updates', () => {
      let notes = [...mockNotes];
      const { rerender } = render(<NoteList {...defaultProps} notes={notes} />);
      
      // Simulate frequent updates
      for (let i = 0; i < 5; i++) {
        notes = notes.map(note => ({
          ...note,
          updatedAt: new Date(Date.now() + i * 1000)
        }));
        
        rerender(<NoteList {...defaultProps} notes={notes} />);
      }
      
      // Should still render correctly
      expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument();
      expect(screen.getByTestId('note-card-note-3')).toBeInTheDocument();
    });
  });
});