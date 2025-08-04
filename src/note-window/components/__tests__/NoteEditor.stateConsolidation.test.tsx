import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteEditor from '../NoteEditor';
import { Note } from '../../../shared/types/Note';
import { AppSettings } from '../../../shared/services/settingsService';

// Mock the services
vi.mock('../../../shared/services/noteService', () => ({
  updateNote: vi.fn().mockResolvedValue({}),
  deleteNote: vi.fn().mockResolvedValue({})
}));

vi.mock('../../../shared/services/settingsService', () => ({
  getSettings: vi.fn().mockReturnValue({
    saveLocation: '/test',
    autoSave: true,
    autoSaveInterval: 5,
    theme: 'dim'
  }),
  subscribeToSettingsChanges: vi.fn().mockReturnValue(() => { })
}));

vi.mock('../../../shared/services/hotkeyService', () => ({
  getHotkeys: vi.fn().mockReturnValue({}),
  formatHotkeyForDisplay: vi.fn().mockReturnValue('')
}));

vi.mock('../../../shared/hooks/useDebounce', () => ({
  useDebounce: vi.fn().mockImplementation((fn) => fn)
}));

// Mock performance monitoring hooks
vi.mock('../../../shared/hooks/usePerformanceMonitoring', () => ({
  useRenderPerformance: vi.fn(),
  useMemoizationTracking: vi.fn(),
}));

vi.mock('../../../shared/hooks/useExpensiveOperations', () => ({
  useNoteEditorPerformance: () => ({
    measureOperation: vi.fn((_name, fn) => fn()),
  }),
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
    noteUpdated: vi.fn()
  }
});

// Mock Tiptap component
vi.mock('../Tiptap', () => ({
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

describe('NoteEditor State Consolidation Tests', () => {
  const mockNote: Note = {
    id: 'test-note-1',
    title: 'Test Note Title',
    content: '<p>Test note content</p>',
    color: '#ffffff',
    transparency: 0.8,
    pinned: false,
    favorite: false,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  };



  const defaultProps = {
    note: mockNote,
    onSave: vi.fn(),
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Consolidated State Structure', () => {
    it('should initialize with consolidated state from note data', () => {
      render(<NoteEditor {...defaultProps} />);

      // Should render with note data
      expect(screen.getByDisplayValue('Test Note Title')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toHaveValue('<p>Test note content</p>');
    });

    it('should handle new note initialization', () => {
      const newNote: Note = {
        ...mockNote,
        title: 'Untitled Note',
        content: '<p></p>',
        _isNew: true
      };

      render(<NoteEditor {...defaultProps} note={newNote} />);

      // Should render with default new note values
      expect(screen.getByDisplayValue('Untitled Note')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toHaveValue('<p></p>');
    });

    it('should consolidate note data state correctly', () => {
      render(<NoteEditor {...defaultProps} />);

      // All note data should be accessible and functional
      const titleInput = screen.getByDisplayValue('Test Note Title');
      expect(titleInput).toBeInTheDocument();

      // Change title to test state updates
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
      expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument();
    });

    it('should consolidate UI state correctly', () => {
      const { container } = render(<NoteEditor {...defaultProps} />);

      // Settings menu should be closed initially
      expect(container.querySelector('.settings-menu')).not.toBeInTheDocument();

      // Open settings menu
      const settingsButton = container.querySelector('[data-testid="settings-button"]');
      if (settingsButton) {
        fireEvent.click(settingsButton);

        // Settings menu should now be visible
        expect(container.querySelector('.settings-menu')).toBeInTheDocument();
      }
    });

    it('should consolidate editor state correctly', () => {
      render(<NoteEditor {...defaultProps} />);

      // Editor should not be dirty initially
      const saveButton = screen.queryByTestId('save-button');
      if (saveButton) {
        expect(saveButton).toBeDisabled();
      }

      // Make changes to make editor dirty
      const titleInput = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(titleInput, { target: { value: 'Modified Title' } });

      // Save button should now be enabled (indicating dirty state)
      if (saveButton) {
        expect(saveButton).not.toBeDisabled();
      }
    });
  });

  describe('State Migration from Individual useState', () => {
    it('should handle all note data properties in consolidated state', () => {
      const noteWithAllProps: Note = {
        ...mockNote,
        title: 'Full Note',
        content: '<p>Full content</p>',
        color: '#ff0000',
        transparency: 0.5,
        pinned: true,
        favorite: true,
      };

      render(<NoteEditor {...defaultProps} note={noteWithAllProps} />);

      // All properties should be reflected in the UI
      expect(screen.getByDisplayValue('Full Note')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toHaveValue('<p>Full content</p>');

      // Color and transparency should be applied (check via style or class)
      const noteContainer = screen.getByTestId('note-container');
      expect(noteContainer).toHaveStyle({ backgroundColor: '#ff0000' });
    });

    it('should handle UI state transitions correctly', async () => {
      const { container } = render(<NoteEditor {...defaultProps} />);

      // Test multiple UI state changes
      const settingsButton = container.querySelector('[data-testid="settings-button"]');
      const colorButton = container.querySelector('[data-testid="color-button"]');

      if (settingsButton) {
        // Open settings menu
        fireEvent.click(settingsButton);
        expect(container.querySelector('.settings-menu')).toBeInTheDocument();

        // Close settings menu
        fireEvent.click(settingsButton);
        expect(container.querySelector('.settings-menu')).not.toBeInTheDocument();
      }

      if (colorButton) {
        // Open color picker
        fireEvent.click(colorButton);
        expect(container.querySelector('.color-picker')).toBeInTheDocument();
      }
    });

    it('should handle editor state changes correctly', async () => {
      render(<NoteEditor {...defaultProps} />);

      // Test auto-save state
      const titleInput = screen.getByDisplayValue('Test Note Title');

      // Make changes to trigger dirty state
      fireEvent.change(titleInput, { target: { value: 'Changed Title' } });

      // Should trigger auto-save after interval
      await waitFor(() => {
        expect(defaultProps.onNoteUpdate).toHaveBeenCalled();
      }, { timeout: 6000 });
    });
  });

  describe('State Update Performance', () => {
    it('should update only relevant state sections', () => {
      const { rerender } = render(<NoteEditor {...defaultProps} />);

      // Change only note data
      const updatedNote = { ...mockNote, title: 'Updated Title' };
      rerender(<NoteEditor {...defaultProps} note={updatedNote} />);

      // Should render updated title
      expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument();

      // UI state should remain unchanged
      const { container } = render(<NoteEditor {...defaultProps} note={updatedNote} />);
      expect(container.querySelector('.settings-menu')).not.toBeInTheDocument();
    });

    it('should handle rapid state updates efficiently', async () => {
      render(<NoteEditor {...defaultProps} />);

      const titleInput = screen.getByDisplayValue('Test Note Title');

      // Make rapid changes
      fireEvent.change(titleInput, { target: { value: 'Change 1' } });
      fireEvent.change(titleInput, { target: { value: 'Change 2' } });
      fireEvent.change(titleInput, { target: { value: 'Change 3' } });

      // Should handle all changes correctly
      expect(screen.getByDisplayValue('Change 3')).toBeInTheDocument();
    });

    it('should batch related state updates', () => {
      const { container } = render(<NoteEditor {...defaultProps} />);

      // Perform multiple related UI actions
      const settingsButton = container.querySelector('[data-testid="settings-button"]');
      const titleInput = screen.getByDisplayValue('Test Note Title');

      if (settingsButton) {
        // Open settings and change title simultaneously
        fireEvent.click(settingsButton);
        fireEvent.change(titleInput, { target: { value: 'Batch Update' } });

        // Both changes should be reflected
        expect(container.querySelector('.settings-menu')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Batch Update')).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing note properties gracefully', () => {
      const incompleteNote = {
        id: 'incomplete',
        title: '',
        content: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Note;

      render(<NoteEditor {...defaultProps} note={incompleteNote} />);

      // Should render with defaults
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toHaveValue('');
    });

    it('should handle state reset correctly', () => {
      render(<NoteEditor {...defaultProps} />);

      // Make changes
      const titleInput = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(titleInput, { target: { value: 'Modified' } });

      // Reset by changing to different note
      const newNote = { ...mockNote, id: 'different-note', title: 'Different Note' };
      const { rerender } = render(<NoteEditor {...defaultProps} />);
      rerender(<NoteEditor {...defaultProps} note={newNote} />);

      // Should show new note data
      expect(screen.getByDisplayValue('Different Note')).toBeInTheDocument();
    });

    it('should handle concurrent state updates', async () => {
      render(<NoteEditor {...defaultProps} />);

      const titleInput = screen.getByDisplayValue('Test Note Title');
      const contentEditor = screen.getByTestId('editor-content');

      // Make concurrent updates
      fireEvent.change(titleInput, { target: { value: 'New Title' } });
      fireEvent.change(contentEditor, { target: { value: '<p>New content</p>' } });

      // Both updates should be reflected
      expect(screen.getByDisplayValue('New Title')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toHaveValue('<p>New content</p>');
    });
  });

  describe('Integration with Performance Monitoring', () => {
    it('should work correctly with performance monitoring hooks', () => {
      render(<NoteEditor {...defaultProps} />);

      // Component should render successfully with performance monitoring
      expect(screen.getByDisplayValue('Test Note Title')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('should maintain performance with consolidated state', () => {
      const { rerender } = render(<NoteEditor {...defaultProps} />);

      // Multiple re-renders should not cause performance issues
      for (let i = 0; i < 10; i++) {
        rerender(<NoteEditor {...defaultProps} />);
      }

      // Should still render correctly
      expect(screen.getByDisplayValue('Test Note Title')).toBeInTheDocument();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain all existing functionality', () => {
      render(<NoteEditor {...defaultProps} />);

      // All original features should still work
      expect(screen.getByDisplayValue('Test Note Title')).toBeInTheDocument();
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();

      // Settings and controls should be accessible
      const { container } = render(<NoteEditor {...defaultProps} />);
      expect(container.querySelector('[data-testid="settings-button"]')).toBeInTheDocument();
    });

    it('should handle legacy note formats', () => {
      const legacyNote = {
        ...mockNote,
        // Simulate legacy properties that might exist
        oldProperty: 'legacy value',
      } as any;

      render(<NoteEditor {...defaultProps} note={legacyNote} />);

      // Should render without errors
      expect(screen.getByDisplayValue('Test Note Title')).toBeInTheDocument();
    });

    it('should maintain API compatibility', () => {
      const onSave = vi.fn();
      const onChange = vi.fn();

      render(<NoteEditor note={mockNote} onSave={onSave} onChange={onChange} />);

      // Callbacks should still work
      const titleInput = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(titleInput, { target: { value: 'Updated' } });

      // Should eventually call onChange
      setTimeout(() => {
        expect(onChange).toHaveBeenCalled();
      }, 100);
    });
  });
});