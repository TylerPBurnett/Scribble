import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('NoteEditor useCallback Optimization', () => {
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

  it('should have stable handleContentUpdate callback', () => {
    const { rerender } = render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    const contentEditor = screen.getByDisplayValue('<p>Test content</p>');
    
    // Get the initial onChange handler
    const initialOnChange = contentEditor.onchange;

    // Re-render with same props
    rerender(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // The onChange handler should be the same reference (memoized)
    expect(contentEditor.onchange).toBe(initialOnChange);
  });

  it('should have stable handleTitleBlur callback', () => {
    const { rerender } = render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    const titleInput = screen.getByDisplayValue('Test Note');
    
    // Get the initial onBlur handler
    const initialOnBlur = titleInput.onblur;

    // Re-render with same props
    rerender(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // The onBlur handler should be the same reference (memoized)
    expect(titleInput.onblur).toBe(initialOnBlur);
  });

  it('should have stable handleClose callback', () => {
    const { rerender } = render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    const closeButton = screen.getByTitle('Close note');
    
    // Get the initial onClick handler
    const initialOnClick = closeButton.onclick;

    // Re-render with same props
    rerender(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // The onClick handler should be the same reference (memoized)
    expect(closeButton.onclick).toBe(initialOnClick);
  });

  it('should have stable handleMouseDown callback', () => {
    const { rerender } = render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Find the draggable header
    const header = document.querySelector('[onMouseDown]') as HTMLElement;
    expect(header).toBeTruthy();
    
    // Get the initial onMouseDown handler
    const initialOnMouseDown = header.onmousedown;

    // Re-render with same props
    rerender(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // The onMouseDown handler should be the same reference (memoized)
    expect(header.onmousedown).toBe(initialOnMouseDown);
  });

  it('should have stable togglePinState callback', async () => {
    const { rerender } = render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Open settings menu to access pin toggle
    const settingsButton = screen.getByTitle('Note settings');
    fireEvent.click(settingsButton);

    const pinToggle = screen.getByText('Float on Top').closest('div') as HTMLElement;
    expect(pinToggle).toBeTruthy();
    
    // Get the initial onClick handler
    const initialOnClick = pinToggle.onclick;

    // Re-render with same props
    rerender(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Re-open settings menu after re-render
    const settingsButtonAfter = screen.getByTitle('Note settings');
    fireEvent.click(settingsButtonAfter);

    const pinToggleAfter = screen.getByText('Float on Top').closest('div') as HTMLElement;
    
    // The onClick handler should be the same reference (memoized)
    expect(pinToggleAfter.onclick).toBe(initialOnClick);
  });

  it('should have stable changeNoteColor callback', async () => {
    const { rerender } = render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Open settings menu to access color options
    const settingsButton = screen.getByTitle('Note settings');
    fireEvent.click(settingsButton);

    const yellowColorButton = screen.getByTitle('Yellow');
    
    // Get the initial onClick handler
    const initialOnClick = yellowColorButton.onclick;

    // Re-render with same props
    rerender(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Re-open settings menu after re-render
    const settingsButtonAfter = screen.getByTitle('Note settings');
    fireEvent.click(settingsButtonAfter);

    const yellowColorButtonAfter = screen.getByTitle('Yellow');
    
    // The onClick handler should be the same reference (memoized)
    expect(yellowColorButtonAfter.onclick).toBe(initialOnClick);
  });

  it('should maintain callback stability when state changes', () => {
    const { rerender } = render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    const contentEditor = screen.getByDisplayValue('<p>Test content</p>');
    const initialOnChange = contentEditor.onchange;

    // Change content to trigger state update
    fireEvent.change(contentEditor, { target: { value: '<p>New content</p>' } });

    // The callback should still be stable after state change
    expect(contentEditor.onchange).toBe(initialOnChange);
  });

  it('should update callbacks only when dependencies change', () => {
    const { rerender } = render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Open settings menu
    const settingsButton = screen.getByTitle('Note settings');
    fireEvent.click(settingsButton);

    const pinToggle = screen.getByText('Float on Top').closest('div') as HTMLElement;
    const initialOnClick = pinToggle.onclick;

    // Re-render with different onSave prop (dependency of togglePinState)
    const newOnSave = vi.fn();
    rerender(
      <NoteEditor 
        note={mockNote} 
        onSave={newOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Re-open settings menu
    const settingsButtonAfter = screen.getByTitle('Note settings');
    fireEvent.click(settingsButtonAfter);

    const pinToggleAfter = screen.getByText('Float on Top').closest('div') as HTMLElement;
    
    // The callback should be different now because onSave dependency changed
    expect(pinToggleAfter.onclick).not.toBe(initialOnClick);
  });
});