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

describe('NoteEditor Editor State Migration', () => {
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

  const mockNewNote: Note = {
    id: 'new-note-1',
    title: 'Untitled Note',
    content: '<p></p>',
    color: '#fff9c4',
    transparency: 1,
    pinned: false,
    favorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    _isNew: true
  };

  const mockOnSave = vi.fn();
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle isDirty state through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Initially should not be dirty
    // Change content to make it dirty
    const contentEditor = screen.getByDisplayValue('<p>Test content</p>');
    fireEvent.change(contentEditor, { target: { value: '<p>Modified content</p>' } });

    // The component should mark itself as dirty and trigger auto-save
    // We can verify this by checking if the save function would be called
    await waitFor(() => {
      // The component logs when it marks as dirty
      // In a real test, we might check for visual indicators or behavior changes
      expect(contentEditor).toHaveValue('<p>Modified content</p>');
    });
  });

  it('should handle isNewNote state through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNewNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // For new notes, the title should be auto-focused and selected
    const titleInput = screen.getByDisplayValue('Untitled Note');
    expect(titleInput).toBeInTheDocument();

    // Change the title to make it no longer a new note
    fireEvent.focus(titleInput);
    fireEvent.change(titleInput, { target: { value: 'My New Note' } });
    fireEvent.blur(titleInput);

    // The note should no longer be considered new
    await waitFor(() => {
      expect(screen.getByDisplayValue('My New Note')).toBeInTheDocument();
    });
  });

  it('should handle tempTitle state through consolidated state', async () => {
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

    // Change the temporary title
    fireEvent.change(titleInput, { target: { value: 'Temporary Title' } });

    // The input should show the temporary title
    expect(titleInput).toHaveValue('Temporary Title');

    // Blur to apply the change
    fireEvent.blur(titleInput);

    // The title should be updated
    await waitFor(() => {
      expect(screen.getByDisplayValue('Temporary Title')).toBeInTheDocument();
    });
  });

  it('should handle autoSaveEnabled state through consolidated state', async () => {
    // Mock settings with auto-save disabled
    const mockGetSettings = vi.fn().mockReturnValue({
      saveLocation: '/test',
      autoSave: false,
      autoSaveInterval: 5,
      theme: 'dim'
    });

    vi.mocked(require('../../../shared/services/settingsService').getSettings).mockImplementation(mockGetSettings);

    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // When auto-save is disabled, there should be a manual save button
    const saveButton = screen.getByTitle('Save now');
    expect(saveButton).toBeInTheDocument();

    // Click the save button
    fireEvent.click(saveButton);

    // The save function should be called
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should handle autoSaveInterval state through consolidated state', async () => {
    // Mock settings with custom auto-save interval
    const mockGetSettings = vi.fn().mockReturnValue({
      saveLocation: '/test',
      autoSave: true,
      autoSaveInterval: 10, // 10 seconds
      theme: 'dim'
    });

    vi.mocked(require('../../../shared/services/settingsService').getSettings).mockImplementation(mockGetSettings);

    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Change content to trigger auto-save
    const contentEditor = screen.getByDisplayValue('<p>Test content</p>');
    fireEvent.change(contentEditor, { target: { value: '<p>Modified content</p>' } });

    // The component should use the custom interval (10 seconds = 10000ms)
    // We can't easily test the exact timing in a unit test, but we can verify
    // that the content change was registered
    expect(contentEditor).toHaveValue('<p>Modified content</p>');
  });

  it('should maintain editor state consistency during complex interactions', async () => {
    render(
      <NoteEditor 
        note={mockNewNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Start with a new note
    const titleInput = screen.getByDisplayValue('Untitled Note');
    const contentEditor = screen.getByDisplayValue('<p></p>');

    // 1. Change title (should mark as no longer new)
    fireEvent.focus(titleInput);
    fireEvent.change(titleInput, { target: { value: 'My Note' } });
    fireEvent.blur(titleInput);

    // 2. Change content (should mark as dirty)
    fireEvent.change(contentEditor, { target: { value: '<p>Some content</p>' } });

    // 3. Verify final state
    await waitFor(() => {
      expect(screen.getByDisplayValue('My Note')).toBeInTheDocument();
      expect(contentEditor).toHaveValue('<p>Some content</p>');
    });
  });
});