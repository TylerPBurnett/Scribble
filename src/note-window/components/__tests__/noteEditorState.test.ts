import { describe, it, expect } from 'vitest';
import { 
  noteEditorReducer, 
  getDefaultNoteEditorState, 
  initializeStateFromNote,
  updateNoteData,
  updateUIState,
  updateEditorState,
  resetState,
  type NoteEditorState 
} from '../noteEditorState';
import { Note } from '../../../shared/types/Note';
import { AppSettings } from '../../../shared/services/settingsService';

describe('noteEditorState', () => {
  const mockNote: Note = {
    id: 'test-note-1',
    title: 'Test Note',
    content: '<p>Test content</p>',
    color: '#ffffff',
    transparency: 0.8,
    pinned: true,
    favorite: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    collectionId: 'test-collection'
  };

  const mockSettings: AppSettings = {
    saveLocation: '/test',
    autoSave: true,
    autoSaveInterval: 3,
    theme: 'dim'
  };

  describe('getDefaultNoteEditorState', () => {
    it('should return default state with correct structure', () => {
      const defaultState = getDefaultNoteEditorState();
      
      expect(defaultState).toEqual({
        noteData: {
          title: 'Untitled Note',
          content: '<p></p>',
          color: '#fff9c4',
          transparency: 1,
          isPinned: false,
          isFavorite: false,
        },
        uiState: {
          showSettingsMenu: false,
          showColorPicker: false,
          isTitleFocused: false,
          isDragging: false,
        },
        editorState: {
          isDirty: false,
          isNewNote: true,
          tempTitle: 'Untitled Note',
          autoSaveEnabled: true,
          autoSaveInterval: 5000,
        }
      });
    });
  });

  describe('initializeStateFromNote', () => {
    it('should initialize state from note and settings', () => {
      const state = initializeStateFromNote(mockNote, mockSettings);
      
      expect(state.noteData).toEqual({
        title: 'Test Note',
        content: '<p>Test content</p>',
        color: '#ffffff',
        transparency: 0.8,
        isPinned: true,
        isFavorite: true,
      });
      
      expect(state.editorState.autoSaveEnabled).toBe(true);
      expect(state.editorState.autoSaveInterval).toBe(3000); // Converted to milliseconds
      expect(state.editorState.isNewNote).toBe(false);
    });

    it('should detect new notes correctly', () => {
      const newNote: Note = {
        ...mockNote,
        title: 'Untitled Note',
        content: '<p></p>',
        _isNew: true
      };
      
      const state = initializeStateFromNote(newNote, mockSettings);
      expect(state.editorState.isNewNote).toBe(true);
    });
  });

  describe('noteEditorReducer', () => {
    let initialState: NoteEditorState;

    beforeEach(() => {
      initialState = getDefaultNoteEditorState();
    });

    it('should handle UPDATE_NOTE_DATA action', () => {
      const action = updateNoteData({ title: 'New Title', color: '#ff0000' });
      const newState = noteEditorReducer(initialState, action);
      
      expect(newState.noteData.title).toBe('New Title');
      expect(newState.noteData.color).toBe('#ff0000');
      expect(newState.editorState.isDirty).toBe(true);
      // Other properties should remain unchanged
      expect(newState.noteData.content).toBe(initialState.noteData.content);
    });

    it('should handle UPDATE_UI_STATE action', () => {
      const action = updateUIState({ showSettingsMenu: true, isDragging: true });
      const newState = noteEditorReducer(initialState, action);
      
      expect(newState.uiState.showSettingsMenu).toBe(true);
      expect(newState.uiState.isDragging).toBe(true);
      expect(newState.editorState.isDirty).toBe(false); // Should not affect dirty state
      // Other UI state should remain unchanged
      expect(newState.uiState.showColorPicker).toBe(false);
    });

    it('should handle UPDATE_EDITOR_STATE action', () => {
      const action = updateEditorState({ isDirty: true, tempTitle: 'Temp Title' });
      const newState = noteEditorReducer(initialState, action);
      
      expect(newState.editorState.isDirty).toBe(true);
      expect(newState.editorState.tempTitle).toBe('Temp Title');
      // Other editor state should remain unchanged
      expect(newState.editorState.isNewNote).toBe(initialState.editorState.isNewNote);
    });

    it('should handle RESET_STATE action', () => {
      const modifiedState = {
        ...initialState,
        noteData: { ...initialState.noteData, title: 'Modified' },
        uiState: { ...initialState.uiState, showSettingsMenu: true }
      };
      
      const action = resetState(initialState);
      const newState = noteEditorReducer(modifiedState, action);
      
      expect(newState).toEqual(initialState);
    });

    it('should handle INITIALIZE_FROM_NOTE action', () => {
      const action = {
        type: 'INITIALIZE_FROM_NOTE' as const,
        payload: { note: mockNote, settings: mockSettings }
      };
      
      const newState = noteEditorReducer(initialState, action);
      
      expect(newState.noteData.title).toBe('Test Note');
      expect(newState.noteData.content).toBe('<p>Test content</p>');
      expect(newState.editorState.autoSaveInterval).toBe(3000);
    });

    it('should return unchanged state for unknown action', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' as any, payload: {} };
      const newState = noteEditorReducer(initialState, unknownAction);
      
      expect(newState).toBe(initialState);
    });
  });

  describe('helper functions', () => {
    it('should create correct action objects', () => {
      const noteDataAction = updateNoteData({ title: 'Test' });
      expect(noteDataAction).toEqual({
        type: 'UPDATE_NOTE_DATA',
        payload: { title: 'Test' }
      });

      const uiStateAction = updateUIState({ showSettingsMenu: true });
      expect(uiStateAction).toEqual({
        type: 'UPDATE_UI_STATE',
        payload: { showSettingsMenu: true }
      });

      const editorStateAction = updateEditorState({ isDirty: true });
      expect(editorStateAction).toEqual({
        type: 'UPDATE_EDITOR_STATE',
        payload: { isDirty: true }
      });
    });
  });
});