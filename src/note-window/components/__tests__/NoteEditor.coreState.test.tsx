import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
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

describe('NoteEditor Core State Migration', () => {
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

  it('should initialize with note data from props', () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Check that the title input shows the correct value
    const titleInput = screen.getByDisplayValue('Test Note');
    expect(titleInput).toBeInTheDocument();

    // Check that the content editor shows the correct value
    const contentEditor = screen.getByDisplayValue('<p>Test content</p>');
    expect(contentEditor).toBeInTheDocument();
  });

  it('should update title through consolidated state', async () => {
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
    
    // Change the title
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    
    // Blur to apply the change
    fireEvent.blur(titleInput);

    // Verify the title was updated
    await waitFor(() => {
      expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument();
    });
  });

  it('should update content through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    const contentEditor = screen.getByDisplayValue('<p>Test content</p>');
    
    // Change the content
    fireEvent.change(contentEditor, { target: { value: '<p>Updated content</p>' } });

    // Verify the content was updated
    await waitFor(() => {
      expect(screen.getByDisplayValue('<p>Updated content</p>')).toBeInTheDocument();
    });
  });

  it('should handle transparency updates through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Open settings menu
    const settingsButton = screen.getByTitle('Note settings');
    fireEvent.click(settingsButton);

    // Find and adjust transparency slider
    const transparencySlider = screen.getByDisplayValue('0.8');
    fireEvent.change(transparencySlider, { target: { value: '0.5' } });

    // Verify window controls setTransparency was called
    await waitFor(() => {
      expect(window.windowControls.setTransparency).toHaveBeenCalledWith(0.5);
    });
  });

  it('should handle favorite toggle through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Open settings menu
    const settingsButton = screen.getByTitle('Note settings');
    fireEvent.click(settingsButton);

    // Click favorite option
    const favoriteOption = screen.getByText('Favorite');
    fireEvent.click(favoriteOption);

    // Verify the note was updated (through the updateNote mock)
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should handle color changes through consolidated state', async () => {
    render(
      <NoteEditor 
        note={mockNote} 
        onSave={mockOnSave} 
        onChange={mockOnChange} 
      />
    );

    // Open settings menu
    const settingsButton = screen.getByTitle('Note settings');
    fireEvent.click(settingsButton);

    // Find and click a color option (yellow)
    const yellowColorButton = screen.getByTitle('Yellow');
    fireEvent.click(yellowColorButton);

    // Verify the note was updated
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });
});