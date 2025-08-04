import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Note } from '../../../shared/types/Note';

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
  subscribeToSettingsChanges: vi.fn().mockReturnValue(() => {})
}));

vi.mock('../../../shared/services/hotkeyService', () => ({
  getHotkeys: vi.fn().mockReturnValue({}),
  formatHotkeyForDisplay: vi.fn().mockReturnValue('')
}));

vi.mock('../../shared/hooks/useDebounce', () => ({
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
    noteUpdated: vi.fn()
  }
});

// Mock Tiptap component
vi.mock('../Tiptap', () => ({
  default: React.forwardRef(({ content, onUpdate, placeholder, autofocus }: any, ref: any) => (
    <div data-testid="tiptap-editor">
      <textarea 
        value={content}
        onChange={(e) => onUpdate?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autofocus}
      />
    </div>
  ))
}));

// Mock NoteHotkeys component
vi.mock('../NoteHotkeys', () => ({
  NoteHotkeys: ({ settings, note, onSave, onTogglePin, onDelete }: any) => (
    <div data-testid="note-hotkeys" />
  )
}));

// Import the component after mocks
import NoteEditor from '../NoteEditor';

describe('NoteEditor UI State Migration', () => {
  const mockNote: Note = {
    id: 'test-note-1',
    title: 'Test Note',
    content: '<p>Test content</p>',
    color: '#ffffff',
    transparency: 0.8,
    pinned: false,
    favorite: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockOnSave = vi.fn();
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle showSettingsMenu state through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Initially settings menu should not be visible
    expect(screen.queryByText('Favorite')).not.toBeInTheDocument();

    // Click settings button to open menu
    const settingsButton = screen.getByTitle('Note settings');
    fireEvent.click(settingsButton);

    // Settings menu should now be visible
    await waitFor(() => {
      expect(screen.getByText('Favorite')).toBeInTheDocument();
    });

    // Click outside to close menu
    fireEvent.mouseDown(document.body);

    // Settings menu should be closed
    await waitFor(() => {
      expect(screen.queryByText('Favorite')).not.toBeInTheDocument();
    });
  });

  it('should handle isTitleFocused state through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    const titleInput = screen.getByDisplayValue('Test Note');

    // Focus the title input
    fireEvent.focus(titleInput);

    // The input should have focus styling (this would be tested through CSS classes in a real scenario)
    expect(titleInput).toHaveFocus();

    // Change the title while focused
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    // Blur the input
    fireEvent.blur(titleInput);

    // Title should be updated after blur
    await waitFor(() => {
      expect(screen.getByDisplayValue('New Title')).toBeInTheDocument();
    });
  });

  it('should handle isDragging state through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Find the draggable header area
    const header = screen.getByRole('banner') || document.querySelector('[onMouseDown]');
    
    if (header) {
      // Simulate mouse down on header (should start dragging)
      fireEvent.mouseDown(header);

      // Simulate mouse move (should trigger window movement)
      fireEvent.mouseMove(document, { movementX: 10, movementY: 10 });

      // Verify window controls moveWindow was called
      expect(window.windowControls.moveWindow).toHaveBeenCalledWith(10, 10);

      // Simulate mouse up (should stop dragging)
      fireEvent.mouseUp(document);
    }
  });

  it('should handle showColorPicker state through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Open settings menu first
    const settingsButton = screen.getByTitle('Note settings');
    fireEvent.click(settingsButton);

    // Look for color options in the settings menu
    await waitFor(() => {
      const yellowButton = screen.getByTitle('Yellow');
      expect(yellowButton).toBeInTheDocument();
    });

    // The color picker functionality is integrated into the settings menu
    // so we can verify it's working by checking color options are available
    const colorButtons = screen.getAllByRole('button').filter(button => 
      button.getAttribute('title')?.includes('Yellow') || 
      button.getAttribute('title')?.includes('White') ||
      button.getAttribute('title')?.includes('Black')
    );
    
    expect(colorButtons.length).toBeGreaterThan(0);
  });

  it('should maintain UI state consistency during interactions', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Test multiple UI state changes in sequence
    
    // 1. Open settings menu
    const settingsButton = screen.getByTitle('Note settings');
    fireEvent.click(settingsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Favorite')).toBeInTheDocument();
    });

    // 2. Focus title while menu is open
    const titleInput = screen.getByDisplayValue('Test Note');
    fireEvent.focus(titleInput);
    
    expect(titleInput).toHaveFocus();

    // 3. Change title
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    // 4. Close settings menu by clicking outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Favorite')).not.toBeInTheDocument();
    });

    // 5. Blur title to apply changes
    fireEvent.blur(titleInput);

    // Verify final state
    await waitFor(() => {
      expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument();
    });
  });
});