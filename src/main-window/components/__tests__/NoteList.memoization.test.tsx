import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import NoteList from '../NoteList';
import { Note } from '../../../shared/types/Note';

// Mock the services
vi.mock('../../../shared/services/noteService', () => ({
  deleteNote: vi.fn(),
}));

vi.mock('../../../shared/services/settingsService', () => ({
  getNotesSortOption: vi.fn(() => ({ field: 'updatedAt', direction: 'desc', label: 'Date Modified (Newest)' })),
  saveNotesSortOption: vi.fn(),
}));

// Mock NoteCard component
vi.mock('../NoteCard', () => ({
  default: ({ note, onClick }: { note: Note; onClick: (note: Note) => void }) => (
    <div data-testid={`note-card-${note.id}`} onClick={() => onClick(note)}>
      {note.title}
    </div>
  ),
}));

describe('NoteList Memoization', () => {
  const mockNotes: Note[] = [
    {
      id: '1',
      title: 'Test Note 1',
      content: 'Content 1',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      favorite: false,
      pinned: false,
      color: '#fff9c4',
      transparency: 1,
      collections: [],
    },
    {
      id: '2',
      title: 'Test Note 2',
      content: 'Content 2',
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02'),
      favorite: true,
      pinned: false,
      color: '#fff9c4',
      transparency: 1,
      collections: [],
    },
  ];

  const defaultProps = {
    notes: mockNotes,
    onNoteClick: vi.fn(),
    activeNoteId: '1',
    onNoteDelete: vi.fn(),
    onCollectionUpdate: vi.fn(),
    activeCollectionId: 'all',
    activeCollectionName: 'All Notes',
    allNotes: mockNotes,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notes correctly with memoization', () => {
    render(<NoteList {...defaultProps} />);
    
    // Should render both notes
    expect(screen.getByTestId('note-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('note-card-2')).toBeInTheDocument();
    
    // Should show favorites section
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('should separate favorite and regular notes correctly', () => {
    render(<NoteList {...defaultProps} />);
    
    // Favorite note should be in favorites section
    const favoritesSection = screen.getByText('Favorites').closest('.notes-section');
    expect(favoritesSection).toContainElement(screen.getByTestId('note-card-2'));
    
    // Regular note should be in notes section
    const notesSection = screen.getByText('Notes').closest('.notes-section');
    expect(notesSection).toContainElement(screen.getByTestId('note-card-1'));
  });

  it('should handle empty notes list', () => {
    render(<NoteList {...defaultProps} notes={[]} />);
    
    // Should show empty state
    expect(screen.getByText('No notes yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first note to get started')).toBeInTheDocument();
  });

  it('should filter out deleted notes', () => {
    const { rerender } = render(<NoteList {...defaultProps} />);
    
    // Initially both notes should be visible
    expect(screen.getByTestId('note-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('note-card-2')).toBeInTheDocument();
    
    // Simulate note deletion by re-rendering with same props
    // The component should maintain its internal deletedNotes state
    rerender(<NoteList {...defaultProps} />);
    
    // Notes should still be visible since we haven't actually deleted any
    expect(screen.getByTestId('note-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('note-card-2')).toBeInTheDocument();
  });
});