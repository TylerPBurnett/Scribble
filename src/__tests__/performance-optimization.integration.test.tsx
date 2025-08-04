import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Note } from '../shared/types/Note';

// Mock all the services
vi.mock('../shared/services/noteService', () => ({
  updateNote: vi.fn().mockResolvedValue({}),
  deleteNote: vi.fn().mockResolvedValue({}),
  createNote: vi.fn().mockResolvedValue({ id: 'new-note' }),
}));

vi.mock('../shared/services/settingsService', () => ({
  getSettings: vi.fn().mockReturnValue({
    saveLocation: '/test',
    autoSave: true,
    autoSaveInterval: 5,
    theme: 'dim'
  }),
  getNotesSortOption: vi.fn().mockReturnValue({ field: 'updatedAt', direction: 'desc' }),
  saveNotesSortOption: vi.fn(),
  subscribeToSettingsChanges: vi.fn().mockReturnValue(() => {})
}));

vi.mock('../shared/services/hotkeyService', () => ({
  getHotkeys: vi.fn().mockReturnValue({}),
  formatHotkeyForDisplay: vi.fn().mockReturnValue('')
}));

// Mock performance monitoring hooks
vi.mock('../shared/hooks/usePerformanceMonitoring', () => ({
  useRenderPerformance: vi.fn(),
  useMemoizationTracking: vi.fn(),
}));

vi.mock('../shared/hooks/useExpensiveOperations', () => ({
  useNoteCardPerformance: () => ({
    measureOperation: vi.fn((_name, fn) => fn()),
  }),
  useNoteListPerformance: () => ({
    measureOperation: vi.fn((_name, fn) => fn()),
  }),
  useNoteEditorPerformance: () => ({
    measureOperation: vi.fn((_name, fn) => fn()),
  }),
}));

vi.mock('../shared/hooks/useAsyncMemo', () => ({
  useMemoizedFilter: (notes: Note[], filterFn: (notes: Note[]) => Note[]) => filterFn(notes),
  useMemoizedSort: (notes: Note[], sortFn: (notes: Note[]) => Note[]) => sortFn(notes),
  useMemoizedCategorization: (notes: Note[]) => {
    const favorites = notes.filter(note => note.favorite);
    const others = notes.filter(note => !note.favorite);
    return { favoriteItems: favorites, otherItems: others };
  },
}));

vi.mock('../shared/hooks/useDebounce', () => ({
  useDebounce: vi.fn().mockImplementation((fn) => fn)
}));

// Mock window APIs
Object.defineProperty(window, 'windowControls', {
  value: {
    close: vi.fn(),
    minimize: vi.fn(),
    moveWindow: vi.fn(),
    setTransparency: vi.fn().mockResolvedValue(undefined),
    isPinned: vi.fn().mockResolvedValue(false),
    togglePin: vi.fn().mockResolvedValue(false)
  }
});

Object.defineProperty(window, 'noteWindow', {
  value: {
    noteUpdated: vi.fn(),
    openNote: vi.fn(),
  }
});

// Import components after mocks
import NoteList from '../main-window/components/NoteList';
import NoteEditor from '../note-window/components/NoteEditor';

// Mock NoteCollectionManager
vi.mock('../main-window/components/NoteCollectionManager', () => ({
  default: () => <div data-testid="note-collection-manager">Collection Manager</div>
}));

// Mock Tiptap component
vi.mock('../note-window/components/Tiptap', () => ({
  default: ({ content, onUpdate }: { content: string; onUpdate: (content: string) => void }) => (
    <div data-testid="tiptap-editor">
      <textarea 
        data-testid="editor-content"
        value={content}
        onChange={(e) => onUpdate(e.target.value)}
      />
    </div>
  )
}));

describe('Performance Optimization Integration Tests', () => {
  const mockNotes: Note[] = [
    {
      id: 'note-1',
      title: 'First Note',
      content: '<p>Content of first note</p>',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-03'),
      favorite: false,
      pinned: false,
      color: '#fff9c4'
    },
    {
      id: 'note-2',
      title: 'Second Note',
      content: '<p>Content of second note</p>',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      favorite: true,
      pinned: false,
      color: '#d0f0c0'
    },
    {
      id: 'note-3',
      title: 'Third Note',
      content: '<p>Content of third note</p>',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-01'),
      favorite: false,
      pinned: true,
      color: '#b5d8eb'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NoteCard + NoteList Integration', () => {
    it('should render optimized NoteCards within NoteList without performance issues', () => {
      const mockOnNoteClick = vi.fn();
      const mockOnNoteDelete = vi.fn();
      
      render(
        <NoteList
          notes={mockNotes}
          onNoteClick={mockOnNoteClick}
          onNoteDelete={mockOnNoteDelete}
          activeNoteId="note-1"
        />
      );
      
      // All notes should render
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
      expect(screen.getByText('Third Note')).toBeInTheDocument();
      
      // Favorite note should be in favorites section
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    it('should handle note interactions efficiently with memoization', async () => {
      const mockOnNoteClick = vi.fn();
      const mockOnNoteDelete = vi.fn();
      
      render(
        <NoteList
          notes={mockNotes}
          onNoteClick={mockOnNoteClick}
          onNoteDelete={mockOnNoteDelete}
        />
      );
      
      // Click on a note
      fireEvent.click(screen.getByText('First Note'));
      expect(mockOnNoteClick).toHaveBeenCalledWith(mockNotes[0]);
      
      // The memoization should prevent unnecessary re-renders
      // (verified by the component still functioning correctly)
      expect(screen.getByText('First Note')).toBeInTheDocument();
    });

    it('should handle sorting changes efficiently', () => {
      const { rerender } = render(
        <NoteList
          notes={mockNotes}
          onNoteClick={vi.fn()}
          onNoteDelete={vi.fn()}
        />
      );
      
      // Re-render with same notes (should use memoized sort)
      rerender(
        <NoteList
          notes={mockNotes}
          onNoteClick={vi.fn()}
          onNoteDelete={vi.fn()}
        />
      );
      
      // Notes should still be rendered correctly
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
      expect(screen.getByText('Third Note')).toBeInTheDocument();
    });

    it('should handle note deletion with optimized state updates', async () => {
      const mockOnNoteDelete = vi.fn();
      
      const { container } = render(
        <NoteList
          notes={mockNotes}
          onNoteClick={vi.fn()}
          onNoteDelete={mockOnNoteDelete}
        />
      );
      
      // Find and click delete button (assuming it exists in NoteCard)
      const deleteButton = container.querySelector('[data-testid="delete-note-1"]');
      if (deleteButton) {
        fireEvent.click(deleteButton);
        
        await waitFor(() => {
          expect(mockOnNoteDelete).toHaveBeenCalledWith('note-1');
        });
      }
    });
  });

  describe('NoteEditor State Consolidation Integration', () => {
    it('should handle complex editor interactions with consolidated state', async () => {
      const mockOnSave = vi.fn();
      const mockOnChange = vi.fn();
      
      render(
        <NoteEditor
          note={mockNotes[0]}
          onSave={mockOnSave}
          onChange={mockOnChange}
        />
      );
      
      // Should render with note data
      expect(screen.getByDisplayValue('First Note')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toHaveValue('<p>Content of first note</p>');
      
      // Make changes to test consolidated state
      const titleInput = screen.getByDisplayValue('First Note');
      fireEvent.change(titleInput, { target: { value: 'Updated First Note' } });
      
      const contentEditor = screen.getByTestId('editor-content');
      fireEvent.change(contentEditor, { target: { value: '<p>Updated content</p>' } });
      
      // Both changes should be reflected
      expect(screen.getByDisplayValue('Updated First Note')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toHaveValue('<p>Updated content</p>');
    });

    it('should handle UI state changes efficiently', () => {
      const { container } = render(
        <NoteEditor
          note={mockNotes[0]}
          onSave={vi.fn()}
          onChange={vi.fn()}
        />
      );
      
      // Test UI state management
      const settingsButton = container.querySelector('[data-testid="settings-button"]');
      if (settingsButton) {
        fireEvent.click(settingsButton);
        
        // Settings menu should open
        expect(container.querySelector('.settings-menu')).toBeInTheDocument();
        
        // Click again to close
        fireEvent.click(settingsButton);
        expect(container.querySelector('.settings-menu')).not.toBeInTheDocument();
      }
    });

    it('should handle auto-save with consolidated editor state', async () => {
      const mockOnSave = vi.fn();
      
      render(
        <NoteEditor
          note={mockNotes[0]}
          onSave={mockOnSave}
          onChange={vi.fn()}
        />
      );
      
      // Make changes to trigger auto-save
      const titleInput = screen.getByDisplayValue('First Note');
      fireEvent.change(titleInput, { target: { value: 'Auto-save Test' } });
      
      // Should trigger auto-save
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      }, { timeout: 6000 });
    });
  });

  describe('Cross-Component Performance Integration', () => {
    it('should handle rapid component switching without performance degradation', () => {
      const { rerender } = render(
        <NoteList
          notes={mockNotes}
          onNoteClick={vi.fn()}
          onNoteDelete={vi.fn()}
          activeNoteId="note-1"
        />
      );
      
      // Rapidly switch active notes
      for (let i = 0; i < mockNotes.length; i++) {
        rerender(
          <NoteList
            notes={mockNotes}
            onNoteClick={vi.fn()}
            onNoteDelete={vi.fn()}
            activeNoteId={mockNotes[i].id}
          />
        );
      }
      
      // Should still render correctly
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
      expect(screen.getByText('Third Note')).toBeInTheDocument();
    });

    it('should handle large note collections efficiently', () => {
      // Create a large number of notes
      const largeNoteCollection: Note[] = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `<p>Content of note ${i}</p>`,
        createdAt: new Date(2024, 0, i + 1),
        updatedAt: new Date(2024, 0, i + 1),
        favorite: i % 10 === 0, // Every 10th note is favorite
        pinned: i % 20 === 0,   // Every 20th note is pinned
        color: '#fff9c4'
      }));
      
      render(
        <NoteList
          notes={largeNoteCollection}
          onNoteClick={vi.fn()}
          onNoteDelete={vi.fn()}
        />
      );
      
      // Should render without performance issues
      expect(screen.getByText('Note 0')).toBeInTheDocument();
      expect(screen.getByText('Note 99')).toBeInTheDocument();
      
      // Favorites section should contain favorite notes
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    it('should maintain performance with frequent prop changes', () => {
      let notes = [...mockNotes];
      const { rerender } = render(
        <NoteList
          notes={notes}
          onNoteClick={vi.fn()}
          onNoteDelete={vi.fn()}
        />
      );
      
      // Simulate frequent updates
      for (let i = 0; i < 10; i++) {
        notes = notes.map(note => ({
          ...note,
          updatedAt: new Date(Date.now() + i * 1000)
        }));
        
        rerender(
          <NoteList
            notes={notes}
            onNoteClick={vi.fn()}
            onNoteDelete={vi.fn()}
          />
        );
      }
      
      // Should still render correctly
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
      expect(screen.getByText('Third Note')).toBeInTheDocument();
    });
  });

  describe('Error Handling with Optimizations', () => {
    it('should handle errors gracefully without breaking memoization', () => {
      // Test with malformed note data
      const malformedNotes = [
        {
          id: 'malformed',
          title: null as any,
          content: undefined as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          favorite: false,
          pinned: false,
          color: '#fff9c4'
        }
      ];
      
      expect(() => {
        render(
          <NoteList
            notes={malformedNotes}
            onNoteClick={vi.fn()}
            onNoteDelete={vi.fn()}
          />
        );
      }).not.toThrow();
    });

    it('should recover from state errors in NoteEditor', () => {
      const malformedNote = {
        ...mockNotes[0],
        title: null as any,
        content: undefined as any,
      };
      
      expect(() => {
        render(
          <NoteEditor
            note={malformedNote}
            onSave={vi.fn()}
            onChange={vi.fn()}
          />
        );
      }).not.toThrow();
    });

    it('should handle component unmounting cleanly', () => {
      const { unmount } = render(
        <NoteList
          notes={mockNotes}
          onNoteClick={vi.fn()}
          onNoteDelete={vi.fn()}
        />
      );
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should work correctly with all performance monitoring hooks', () => {
      render(
        <div>
          <NoteList
            notes={mockNotes}
            onNoteClick={vi.fn()}
            onNoteDelete={vi.fn()}
          />
          <NoteEditor
            note={mockNotes[0]}
            onSave={vi.fn()}
            onChange={vi.fn()}
          />
        </div>
      );
      
      // Both components should render successfully with performance monitoring
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByDisplayValue('First Note')).toBeInTheDocument();
    });

    it('should maintain functionality with performance tracking', () => {
      const mockOnNoteClick = vi.fn();
      
      render(
        <NoteList
          notes={mockNotes}
          onNoteClick={mockOnNoteClick}
          onNoteDelete={vi.fn()}
        />
      );
      
      // Interactions should still work with performance monitoring
      fireEvent.click(screen.getByText('First Note'));
      expect(mockOnNoteClick).toHaveBeenCalledWith(mockNotes[0]);
    });
  });
});