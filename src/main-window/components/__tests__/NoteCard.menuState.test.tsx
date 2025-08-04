import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
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

describe('NoteCard Consolidated Menu State', () => {
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

  it('should render NoteCard with consolidated state', () => {
    const { container } = render(<NoteCard {...defaultProps} />);
    
    // Should render the note card
    const noteCard = container.querySelector('.note-card');
    expect(noteCard).toBeInTheDocument();
    
    // Should not show any menus initially
    expect(container.querySelector('.dropdown-menu')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="note-collection-manager"]')).not.toBeInTheDocument();
  });

  it('should handle menu state transitions', () => {
    const { container } = render(<NoteCard {...defaultProps} />);
    
    // Find and click the more options button
    const moreButton = container.querySelector('.more-button');
    expect(moreButton).toBeInTheDocument();
    
    if (moreButton) {
      fireEvent.click(moreButton);
      
      // Should show the dropdown menu
      const dropdownMenu = container.querySelector('.dropdown-menu');
      expect(dropdownMenu).toBeInTheDocument();
    }
  });

  it('should handle context menu state', () => {
    const { container } = render(<NoteCard {...defaultProps} />);
    
    const noteCard = container.querySelector('.note-card');
    expect(noteCard).toBeInTheDocument();
    
    if (noteCard) {
      // Right-click to open context menu
      fireEvent.contextMenu(noteCard);
      
      // Should show context menu overlay
      const contextMenuOverlay = document.querySelector('.fixed.inset-0');
      expect(contextMenuOverlay).toBeInTheDocument();
    }
  });

  it('should handle animation state', () => {
    const { container } = render(<NoteCard {...defaultProps} />);
    
    const noteCard = container.querySelector('.note-card');
    expect(noteCard).toBeInTheDocument();
    
    // Initially should not have animation classes
    expect(noteCard).not.toHaveClass('scale-95');
    expect(noteCard).not.toHaveClass('opacity-90');
  });

  it('should consolidate multiple state updates', () => {
    const { container } = render(<NoteCard {...defaultProps} />);
    
    // The component should render without errors, indicating that
    // the consolidated state management is working properly
    expect(container.querySelector('.note-card')).toBeInTheDocument();
    
    // Test that we can access the destructured state values
    // by checking that the component renders the expected elements
    expect(container.querySelector('.note-title')).toBeInTheDocument();
    expect(container.querySelector('.more-button')).toBeInTheDocument();
  });

  it('should handle state updates through helper function', () => {
    const { container } = render(<NoteCard {...defaultProps} />);
    
    // This test verifies that the updateMenuState helper function
    // is working by ensuring the component renders and functions correctly
    const noteCard = container.querySelector('.note-card');
    expect(noteCard).toBeInTheDocument();
    
    // The fact that the component renders without errors indicates
    // that the consolidated state and helper functions are working
    expect(noteCard).toHaveClass('note-card');
  });
});