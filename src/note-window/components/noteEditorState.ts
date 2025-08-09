import { Note } from '../../shared/types/Note';
import { AppSettings } from '../../shared/services/settingsService';
import { getDefaultNoteColorForTheme } from '../../shared/constants/colors';

// Consolidated state interface
export interface NoteEditorState {
  // Core note data
  noteData: {
    title: string;
    content: string;
    color: string;
    transparency: number;
    isPinned: boolean;
    isFavorite: boolean;
  };
  
  // UI state
  uiState: {
    showSettingsMenu: boolean;
    showColorPicker: boolean;
    isTitleFocused: boolean;
    isDragging: boolean;
  };
  
  // Editor state
  editorState: {
    isDirty: boolean;
    isNewNote: boolean;
    tempTitle: string;
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
  };
}

// Action types for the reducer
export type NoteEditorAction = 
  | { type: 'UPDATE_NOTE_DATA'; payload: Partial<NoteEditorState['noteData']> }
  | { type: 'UPDATE_UI_STATE'; payload: Partial<NoteEditorState['uiState']> }
  | { type: 'UPDATE_EDITOR_STATE'; payload: Partial<NoteEditorState['editorState']> }
  | { type: 'RESET_STATE'; payload: NoteEditorState }
  | { type: 'INITIALIZE_FROM_NOTE'; payload: { note: Note; settings: AppSettings } };

// Reducer function
export const noteEditorReducer = (state: NoteEditorState, action: NoteEditorAction): NoteEditorState => {
  switch (action.type) {
    case 'UPDATE_NOTE_DATA':
      return { 
        ...state, 
        noteData: { ...state.noteData, ...action.payload },
        editorState: { ...state.editorState, isDirty: true }
      };
    
    case 'UPDATE_UI_STATE':
      return { 
        ...state, 
        uiState: { ...state.uiState, ...action.payload } 
      };
    
    case 'UPDATE_EDITOR_STATE':
      return { 
        ...state, 
        editorState: { ...state.editorState, ...action.payload } 
      };
    
    case 'RESET_STATE':
      return action.payload;
    
    case 'INITIALIZE_FROM_NOTE':
      const { note, settings } = action.payload;
      const defaultColor = getDefaultNoteColorForTheme(settings.theme || 'dim');
      const noteColor = note.color || defaultColor;
      
      console.log('INITIALIZE_FROM_NOTE:', {
        noteId: note.id,
        noteColor: note.color,
        settingsTheme: settings.theme,
        defaultColor,
        finalColor: noteColor
      });
      
      return {
        noteData: {
          title: note.title,
          content: note.content,
          color: noteColor,
          transparency: note.transparency || 1,
          isPinned: note.pinned || false,
          isFavorite: note.favorite || false,
        },
        uiState: {
          showSettingsMenu: false,
          showColorPicker: false,
          isTitleFocused: false,
          isDragging: false,
        },
        editorState: {
          isDirty: false,
          isNewNote: note._isNew === true || (note.title === 'Untitled Note' && note.content === '<p></p>'),
          tempTitle: note.title,
          autoSaveEnabled: settings.autoSave,
          autoSaveInterval: settings.autoSaveInterval * 1000, // Convert to milliseconds
        }
      };
    
    default:
      return state;
  }
};

// Helper function to get default state
export const getDefaultNoteEditorState = (theme: string = 'dim'): NoteEditorState => ({
  noteData: {
    title: 'Untitled Note',
    content: '<p></p>',
    color: getDefaultNoteColorForTheme(theme),
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

// Helper function to initialize state from note and settings
export const initializeStateFromNote = (note: Note, settings: AppSettings): NoteEditorState => {
  return noteEditorReducer(getDefaultNoteEditorState(settings.theme || 'dim'), {
    type: 'INITIALIZE_FROM_NOTE',
    payload: { note, settings }
  });
};

// Helper functions for state updates
export const updateNoteData = (payload: Partial<NoteEditorState['noteData']>): NoteEditorAction => ({
  type: 'UPDATE_NOTE_DATA',
  payload
});

export const updateUIState = (payload: Partial<NoteEditorState['uiState']>): NoteEditorAction => ({
  type: 'UPDATE_UI_STATE',
  payload
});

export const updateEditorState = (payload: Partial<NoteEditorState['editorState']>): NoteEditorAction => ({
  type: 'UPDATE_EDITOR_STATE',
  payload
});

export const resetState = (state: NoteEditorState): NoteEditorAction => ({
  type: 'RESET_STATE',
  payload: state
});