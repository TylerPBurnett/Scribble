import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { Note } from '../../shared/types/Note';
import Tiptap, { TiptapRef } from './Tiptap';
import { updateNote, deleteNote } from '../../shared/services/noteService';
import { getSettings, subscribeToSettingsChanges, AppSettings } from '../../shared/services/settingsService';
import { getHotkeys, formatHotkeyForDisplay } from '../../shared/services/hotkeyService';
import { NoteHotkeys } from './NoteHotkeys';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { ColorPicker } from '../../shared/components/ColorPicker';
import { NOTE_COLOR_OPTIONS, getTextColorForBackground, getDarkerShade, getDefaultNoteColorForTheme } from '../../shared/constants/colors';
import { useTheme } from '../../shared/services/themeService';
import { 
  noteEditorReducer, 
  initializeStateFromNote, 
  updateNoteData, 
  updateUIState, 
  updateEditorState
} from './noteEditorState';
import { useNoteEditorPerformance } from '../../shared/hooks/useExpensiveOperations';
import { useRenderPerformance } from '../../shared/hooks/usePerformanceMonitoring';
import { SmartAutosaveService, DEFAULT_AUTOSAVE_CONFIG } from '../../shared/services/smartAutosaveService';
import './NoteEditor.css';
import './SettingsMenu.css';

interface NoteEditorProps {
  note: Note;
  onSave?: (note: Note) => void;
  onChange?: (note: Note) => void;
}

const NoteEditor = ({ note, onSave, onChange }: NoteEditorProps) => {
  // Performance monitoring
  const componentName = `NoteEditor-${note.id}`;
  const { measureOperation } = useNoteEditorPerformance(componentName);
  useRenderPerformance(componentName);

  // Get current theme from context
  const { theme } = useTheme();

  // Initialize consolidated state
  const [appSettings, setAppSettings] = useState<AppSettings>({
    saveLocation: '',
    autoSave: true,
    autoSaveInterval: 5,
    theme: theme, // Use current theme from context
  });
  
  // Initialize state from note and settings
  const [state, dispatch] = useReducer(
    noteEditorReducer, 
    initializeStateFromNote(note, { ...appSettings, theme })
  );

  // Extract values from consolidated state for easier access
  const { title, content, color: noteColor, transparency, isPinned, isFavorite } = state.noteData;
  const { showSettingsMenu, showColorPicker, isTitleFocused, isDragging } = state.uiState;
  const { isDirty, isNewNote, tempTitle, autoSaveEnabled, autoSaveInterval } = state.editorState;

  // Use refs to store the latest values for use in debounced functions
  const currentTitleRef = useRef(title);
  const currentContentRef = useRef(content);
  const currentNoteRef = useRef(note);
  const isDirtyRef = useRef(isDirty);

  // Ref for the DOM element
  const editorDomRef = useRef<HTMLDivElement>(null);

  // Ref for the title input element
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Update refs when state changes
  useEffect(() => {
    currentTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    currentContentRef.current = content;
  }, [content]);

  useEffect(() => {
    currentNoteRef.current = note;
  }, [note]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Call onChange whenever title or content changes for real-time preview updates
  useEffect(() => {
    if (onChange) {
      onChange({
        ...note,
        title,
        content
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  // Load settings on component mount and subscribe to changes
  useEffect(() => {
    // Initial settings load
    const settings = getSettings();
    const settingsWithCurrentTheme = { ...settings, theme };
    setAppSettings(settingsWithCurrentTheme);
    
    // Update consolidated state with settings
    dispatch(updateEditorState({
      autoSaveEnabled: settings.autoSave,
      autoSaveInterval: settings.autoSaveInterval * 1000 // Convert to milliseconds
    }));

    // Subscribe to settings changes for immediate hotkey updates
    const unsubscribe = subscribeToSettingsChanges((newSettings) => {
      console.log('NoteEditor - Settings changed, updating hotkeys:', JSON.stringify(newSettings.hotkeys, null, 2));
      const newSettingsWithCurrentTheme = { ...newSettings, theme };
      setAppSettings(newSettingsWithCurrentTheme);
      
      // Update consolidated state with new settings
      dispatch(updateEditorState({
        autoSaveEnabled: newSettings.autoSave,
        autoSaveInterval: newSettings.autoSaveInterval * 1000
      }));
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [theme]);

  // Handle theme changes
  useEffect(() => {
    setAppSettings(prev => ({ ...prev, theme }));
    
    // If this is a new note without a custom color, update it to use the theme-appropriate default
    if (isNewNote && (noteColor === '#F9FAFB' || noteColor === '#fff9c4' || noteColor === '#44475a' || noteColor === '#2d2d2d')) {
      const newDefaultColor = getDefaultNoteColorForTheme(theme);
      if (noteColor !== newDefaultColor) {
        console.log('Updating new note color for theme change:', { from: noteColor, to: newDefaultColor, theme });
        dispatch(updateNoteData({ color: newDefaultColor }));
      }
    }
  }, [theme, isNewNote, noteColor]);

// Autosave service setup
const autosaveService = useRef<SmartAutosaveService | null>(null);

useEffect(() => {
  // Initialize autosave service
  const config = {
    ...DEFAULT_AUTOSAVE_CONFIG,
    strategies: {
      ...DEFAULT_AUTOSAVE_CONFIG.strategies,
      debounce: {
        ...DEFAULT_AUTOSAVE_CONFIG.strategies.debounce,
        delay: appSettings.autoSaveInterval * 1000,
      },
    },
  };

  autosaveService.current = new SmartAutosaveService(config);
  autosaveService.current.initializeAutosave(note, () => currentContentRef.current, savedNote => {
    // Update references and notify on save
    currentNoteRef.current = savedNote;
    onSave?.(savedNote);
    dispatch(updateEditorState({ isDirty: false }));
  });

  return () => {
    autosaveService.current?.destroy();
  };
}, [note, appSettings, onSave]);

// Define a stable save function that uses refs to access the latest state
const saveNote = useCallback(async () => {
  if (autosaveService.current) {
    await autosaveService.current.triggerAutosave(currentNoteRef.current, currentContentRef.current, savedNote => {
      currentNoteRef.current = savedNote;
      onSave?.(savedNote);
      dispatch(updateEditorState({ isDirty: false }));
    }, 'high');
  }
}, [onSave]);

  // Create a debounced version of saveNote using our custom hook
  const debouncedSave = useDebounce(() => {
    if (isDirtyRef.current) {
      saveNote();
    }
  }, autoSaveInterval);

  // We're no longer using debounce for title changes
  // Instead, we'll only update the title when the user clicks away from the input



  // Ref for the Tiptap editor to focus content
  const tiptapRef = useRef<TiptapRef>(null);

  // Auto-focus and select title for new notes
  useEffect(() => {
    if (isNewNote && titleInputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select(); // Select all text for immediate replacement
          console.log('Auto-focused and selected title for new note');
        }
      }, 100);
    }
  }, [isNewNote]);

  // Detect if this is the first title change for a new note
  useEffect(() => {
    if (isNewNote && title !== 'Untitled Note') {
      console.log('First title change for new note detected');
      // Once the title has been changed from the default, it's no longer a new note
      dispatch(updateEditorState({ isNewNote: false }));
    }
  }, [title, isNewNote]);

  // Check if content has changed from the last saved version
  useEffect(() => {
    // Only mark as dirty when:
    // 1. Not currently editing the title (to prevent premature saves)
    // 2. Content has actually changed from the last saved version
    if (!isTitleFocused && content !== currentNoteRef.current.content) {
      console.log('Content changed and not focused, marking as dirty');
      dispatch(updateEditorState({ isDirty: true }));
    }
  }, [content, isTitleFocused]);

  // Check if title has changed from the last saved version
  useEffect(() => {
    // Only mark as dirty when title has changed from the last saved version
    if (title !== currentNoteRef.current.title) {
      console.log('Title changed from saved version, marking as dirty');
      dispatch(updateEditorState({ isDirty: true }));
    }
  }, [title]);

  // Effect to adjust input width based on content
  useEffect(() => {
    if (titleInputRef.current) {
      const inputWidth = isTitleFocused
        ? Math.min(Math.max((tempTitle?.length || 1) * 8, 50), 250)
        : Math.min(Math.max((title?.length || 1) * 8, 50), 250);

      titleInputRef.current.style.width = `${inputWidth}px`;
    }
  }, [tempTitle, title, isTitleFocused]);

  // Trigger debounced save when isDirty changes
  useEffect(() => {
    // Only trigger auto-save when:
    // 1. The note is marked as dirty (has unsaved changes)
    // 2. Auto-save is enabled in settings
    // 3. The user is not currently editing the title
    if (isDirty && autoSaveEnabled && !isTitleFocused) {
      console.log(`Triggering debounced save with interval: ${autoSaveInterval}ms`);
      debouncedSave();
    }

    // Cleanup function to save on unmount if dirty
    return () => {
      if (isDirtyRef.current) {
        console.log('Component unmounting with unsaved changes, saving now');
        saveNote();
      }
    };
  }, [isDirty, autoSaveEnabled, debouncedSave, isTitleFocused, saveNote, autoSaveInterval]);

  // Last saved time formatting removed

  // Dragging functionality is now handled by consolidated state

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Allow dragging from the title bar, but not from input fields or buttons
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT';
    const isButton = target.tagName === 'BUTTON' || target.closest('button');
    const isSvg = target.tagName === 'svg' || target.tagName === 'path' || target.closest('svg');

    if (!isInput && !isButton && !isSvg) {
      dispatch(updateUIState({ isDragging: true }));
    }
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      dispatch(updateUIState({ isDragging: false }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Use IPC to move the window instead of remote
        window.windowControls.moveWindow(e.movementX, e.movementY);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleClose = useCallback(() => {
    window.windowControls.close();
  }, []);

  // Handle title blur - process title changes when focus is lost
  const handleTitleBlur = useCallback(() => {
    // When focus is lost, apply the title change if it's valid
    dispatch(updateUIState({ isTitleFocused: false }));

    // Only apply the change if the title is not empty and not the default
    if (tempTitle && tempTitle.trim() !== '') {
      if (tempTitle !== title) {
        console.log('Applying title change on blur:', tempTitle);
        dispatch(updateNoteData({ title: tempTitle }));

        // If this was a new note, mark it as no longer new
        if (isNewNote && tempTitle !== 'Untitled Note') {
          dispatch(updateEditorState({ isNewNote: false }));
        }
      } else {
        console.log('Title unchanged, not marking as dirty');
      }
    } else {
      console.log('Not applying empty title on blur');
      // Reset to the previous title if empty
      dispatch(updateEditorState({ tempTitle: title }));
    }
  }, [tempTitle, title, isNewNote]);

  // Manual save function
  const handleManualSave = useCallback(() => {
    console.log('Manual save triggered');
    saveNote();
  }, [saveNote]);

  // Content update handler
  const handleContentUpdate = useCallback((newContent: string) => {
    measureOperation('content-update', () => {
      dispatch(updateNoteData({ content: newContent }));
    });
  }, [measureOperation]);

  // Update note transparency
  const updateTransparency = useCallback(async (value: number) => {
    try {
      console.log('Updating transparency to:', value);

      // Update state immediately for UI feedback
      dispatch(updateNoteData({ transparency: value }));

      // Apply transparency to the window via Electron IPC
      // This affects the entire window
      await window.windowControls.setTransparency(value);

      // Update the note's transparency property
      const updatedNote = {
        ...currentNoteRef.current,
        transparency: value,
        // Ensure content is preserved exactly as it was
        content: currentContentRef.current
      };

      // Save the updated note
      const savedNote = await updateNote(updatedNote);
      currentNoteRef.current = savedNote;
      onSave?.(savedNote);

      // Notify other windows that this note has been updated
      window.noteWindow.noteUpdated(savedNote.id, { transparency: value });

      // Don't automatically close the settings menu when adjusting transparency
      // Let the user manually close it or click outside
    } catch (error) {
      console.error('Error updating transparency:', error);
    }
  }, [onSave]);

  // Check window pin state on mount
  useEffect(() => {
    const checkPinState = async () => {
      try {
        const isWindowPinned = await window.windowControls.isPinned();
        dispatch(updateNoteData({ isPinned: isWindowPinned }));
      } catch (error) {
        console.error('Error checking window pin state:', error);
      }
    };

    checkPinState();
  }, []);

  // Initialize window transparency on mount
  useEffect(() => {
    const initTransparency = async () => {
      try {
        console.log('Initializing transparency to:', transparency);

        // Apply the initial transparency value to the window via Electron
        if (transparency !== 1) {
          await window.windowControls.setTransparency(transparency);
        }
      } catch (error) {
        console.error('Error initializing window transparency:', error);
      }
    };

    initTransparency();
  }, []); // Run only once on mount

  // Add keyboard shortcuts for toggling transparency and favorite
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for ⌥⌘T (Alt+Command+T) or Alt+Ctrl+T for Windows - Toggle transparency
      if ((e.altKey && e.metaKey && e.key === 't') || (e.altKey && e.ctrlKey && e.key === 't')) {
        e.preventDefault();
        // Toggle between fully opaque and 70% transparent
        const newTransparency = transparency === 1 ? 0.7 : 1;
        updateTransparency(newTransparency);
      }

      // Check for ⌥⌘S (Alt+Command+S) or Alt+Ctrl+S for Windows - Toggle favorite
      if ((e.altKey && e.metaKey && e.key === 's') || (e.altKey && e.ctrlKey && e.key === 's')) {
        e.preventDefault();

        // Toggle favorite state
        const newFavoriteState = !isFavorite;
        dispatch(updateNoteData({ isFavorite: newFavoriteState }));

        // Update the note
        const updatedNote = {
          ...currentNoteRef.current,
          favorite: newFavoriteState,
          content: currentContentRef.current
        };

        // Save the updated note
        updateNote(updatedNote).then(savedNote => {
          currentNoteRef.current = savedNote;
          onSave?.(savedNote);
          window.noteWindow.noteUpdated(savedNote.id, { favorite: newFavoriteState });
        }).catch(error => {
          console.error('Error toggling favorite state:', error);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [transparency, updateTransparency, isFavorite, onSave]); // Include all dependencies

  // Add click outside handler for settings menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSettingsMenu) {
        // Check if the click was outside the settings menu
        const target = e.target as HTMLElement;
        const isSettingsMenuClick = target.closest('.settings-menu-container');
        const isSettingsButtonClick = target.closest('.settings-button');

        if (!isSettingsMenuClick && !isSettingsButtonClick) {
          dispatch(updateUIState({ showSettingsMenu: false }));
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  // Use shared color options
  const colorOptions = NOTE_COLOR_OPTIONS;

  // Toggle pin state
  const togglePinState = useCallback(async () => {
    try {
      const newPinState = !isPinned;
      const result = await window.windowControls.togglePin(newPinState);
      dispatch(updateNoteData({ isPinned: result }));

      // Update the note's pinned property
      // Create a deep copy of the note to ensure we don't lose any properties
      const updatedNote = {
        ...currentNoteRef.current,
        pinned: result,
        // Ensure content is preserved exactly as it was
        content: currentContentRef.current
      };

      // Save the updated note
      const savedNote = await updateNote(updatedNote);
      currentNoteRef.current = savedNote;
      onSave?.(savedNote);

      // Notify other windows that this note has been updated
      window.noteWindow.noteUpdated(savedNote.id, { pinned: result });
    } catch (error) {
      console.error('Error toggling pin state:', error);
    }
  }, [isPinned, onSave]);

  // Change note color
  const changeNoteColor = useCallback(async (color: string) => {
    try {
      dispatch(updateNoteData({ color }));
      dispatch(updateUIState({ showSettingsMenu: false }));

      // Update the note's color property
      const updatedNote = {
        ...currentNoteRef.current,
        color: color,
        // Ensure content is preserved exactly as it was
        content: currentContentRef.current
      };

      // Save the updated note
      const savedNote = await updateNote(updatedNote);
      currentNoteRef.current = savedNote;
      onSave?.(savedNote);

      // Notify other windows that this note has been updated
      window.noteWindow.noteUpdated(savedNote.id, { color: color });
    } catch (error) {
      console.error('Error changing note color:', error);
    }
  }, [onSave]);



  // Use shared color helper functions
  const getTextColor = () => {
    const textColor = getTextColorForBackground(noteColor);
    console.log('NoteEditor getTextColor:', {
      noteColor,
      textColor,
      theme
    });
    return textColor;
  };


  // Get appropriate button colors based on note background
  const getButtonColors = () => {
    const textColor = getTextColor();
    const isDarkBackground = textColor === '#ffffff';
    
    return {
      inactive: isDarkBackground ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
      hover: '#3b82f6', // Blue color that works on both light and dark
      active: '#3b82f6'
    };
  };

  return (
    <div
      className="note-editor flex flex-col h-screen shadow-lg relative overflow-hidden"
      style={{
        backgroundColor: noteColor,
        color: getTextColor(),
      }}
      ref={editorDomRef}
    >
      {/* Modern dark header with window controls and title */}
      <div
        className="flex items-center justify-between py-2 px-3 border-b border-black/10 cursor-grab shadow-sm"
        onMouseDown={handleMouseDown}
        style={{
          WebkitAppRegion: 'drag',
          borderBottomColor: 'rgba(0,0,0,0.08)',
          backgroundColor: noteColor === '#333333' ? '#21222C' : getDarkerShade(noteColor),
          '--dynamic-text-color': getTextColor()
        } as React.CSSProperties & { '--dynamic-text-color': string }}
      >
        <div className="flex items-center justify-between w-full">
          {/* Left side: Window controls */}
          <div className="flex items-center gap-2">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              title="Close note"
              style={{ 
                WebkitAppRegion: 'no-drag',
                backgroundColor: getButtonColors().inactive.replace('0.5', '0.2'),
                color: getButtonColors().inactive
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = getButtonColors().inactive.replace('0.5', '0.2');
                e.currentTarget.style.color = getButtonColors().inactive;
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18"></path>
                <path d="M6 6L18 18"></path>
              </svg>
            </button>

            {/* Minimize button */}
            <button
              onClick={() => window.windowControls.minimize()}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              title="Minimize"
              style={{ 
                WebkitAppRegion: 'no-drag',
                backgroundColor: getButtonColors().inactive.replace('0.5', '0.2'),
                color: getButtonColors().inactive
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getButtonColors().inactive.replace('0.5', '0.5');
                e.currentTarget.style.color = getButtonColors().hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = getButtonColors().inactive.replace('0.5', '0.2');
                e.currentTarget.style.color = getButtonColors().inactive;
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12H19"></path>
              </svg>
            </button>
          </div>

          {/* Center: Title */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
            <input
              type="text"
              className={`note-title-input text-sm font-medium bg-transparent border-none outline-none focus:outline-none focus:ring-0 font-['Chirp',_'Segoe_UI',_sans-serif] cursor-text text-center ${isTitleFocused ? 'ring-1 ring-blue-400/30 bg-white/10' : ''}`}
              style={{
                WebkitAppRegion: 'no-drag',
                boxShadow: 'none',
                borderRadius: isTitleFocused ? '4px' : '0px',
                padding: isTitleFocused ? '2px 6px' : '2px 0px',
                width: isTitleFocused ?
                  `${Math.min(Math.max((tempTitle?.length || 1) * 8, 50), 250)}px` :
                  `${Math.min(Math.max((title?.length || 1) * 8, 50), 250)}px`,
                color: getTextColor(),
                caretColor: getTextColor()
              }}
              ref={titleInputRef}
              value={isTitleFocused ? tempTitle : title}
              onChange={(e) => {
                // Only update the temporary title while editing
                // This won't trigger any saves
                const newTitle = e.target.value;
                console.log('Title input change (temp):', newTitle);
                dispatch(updateEditorState({ tempTitle: newTitle }));
              }}
              onFocus={() => {
                // When focusing, set the temporary title to the current title
                dispatch(updateEditorState({ tempTitle: title }));
                dispatch(updateUIState({ isTitleFocused: true }));
                console.log('Title focused, preventing saves');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  // Apply title change and move focus to content
                  handleTitleBlur();
                  // Focus the content editor after a small delay
                  setTimeout(() => {
                    if (tiptapRef.current?.focus) {
                      tiptapRef.current.focus();
                      console.log('Moved focus to content editor after Enter/Tab');
                    }
                  }, 50);
                }
              }}
              onBlur={handleTitleBlur}
              placeholder="Untitled Note"
            />
          </div>

{/* Right side: Action buttons */}
<div className="flex items-center gap-2 relative" style={{ WebkitAppRegion: 'no-drag' }}>
  {!autoSaveEnabled && (
    <button
      onClick={handleManualSave}
      className="transition-colors p-1 cursor-pointer"
      style={{
        color: getButtonColors().inactive,
        '--hover-color': getButtonColors().hover
      } as React.CSSProperties & { '--hover-color': string }}
      onMouseEnter={(e) => (e.currentTarget.style.color = getButtonColors().hover)}
      onMouseLeave={(e) => (e.currentTarget.style.color = getButtonColors().inactive)}
      title="Save now"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z"></path>
        <path d="M17 21V13H7V21"></path>
        <path d="M7 3V8H15"></path>
      </svg>
    </button>
  )}

  {/* Settings button */}
            <div className="relative">
              <button
                onClick={() => dispatch(updateUIState({ showSettingsMenu: !showSettingsMenu }))}
                className="settings-button transition-colors p-1 cursor-pointer"
                style={{
                  color: showSettingsMenu ? getButtonColors().active : getButtonColors().inactive
                }}
                onMouseEnter={(e) => {
                  if (!showSettingsMenu) {
                    e.currentTarget.style.color = getButtonColors().hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showSettingsMenu) {
                    e.currentTarget.style.color = getButtonColors().inactive;
                  }
                }}
                title="Note settings"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>

              {/* Settings menu dropdown */}
              {showSettingsMenu && (
                <div
                  className="settings-menu-container absolute right-0 top-full mt-1 rounded-lg shadow-lg z-[9999] w-64"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent drag events
                >
                  {/* Favorite option */}
                  <div
                    className="menu-item py-2 px-4 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={async () => {
                      try {
                        // Toggle favorite state
                        const newFavoriteState = !isFavorite;
                        console.log('NoteEditor - Toggling favorite state to:', newFavoriteState);
                        dispatch(updateNoteData({ isFavorite: newFavoriteState }));

                        // Update the note's favorite property
                        const updatedNote = {
                          ...currentNoteRef.current,
                          favorite: newFavoriteState,
                          // Ensure content is preserved exactly as it was
                          content: currentContentRef.current
                        };
                        console.log('NoteEditor - Updated note object:', updatedNote);

                        // Save the updated note
                        const savedNote = await updateNote(updatedNote);
                        console.log('NoteEditor - Saved note from server:', savedNote);
                        currentNoteRef.current = savedNote;
                        onSave?.(savedNote);

                        // Notify other windows that this note has been updated
                        // Pass the updated favorite property to immediately update the UI
                        console.log('NoteEditor - Notifying other windows with:', { favorite: newFavoriteState });
                        window.noteWindow.noteUpdated(savedNote.id, { favorite: newFavoriteState });
                        console.log('NoteEditor - Notification sent');
                      } catch (error) {
                        console.error('Error toggling favorite state:', error);
                      }
                    }}
                  >
                    <span>Favorite</span>
                    <div className="flex items-center gap-2">
                      {isFavorite && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                      <span className="keyboard-shortcut">⌥⌘S</span>
                    </div>
                  </div>

                  {/* Pinned option with checkmark */}
                  <div
                    className="menu-item py-2 px-4 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={togglePinState}
                  >
                    <span>Float on Top</span>
                    <div className="flex items-center gap-2">
                      {isPinned && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                      <span className="keyboard-shortcut">⌥⌘F</span>
                    </div>
                  </div>

                  {/* Toolbar toggle option */}
                  <div
                    className="menu-item py-2 px-4 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={() => {
                      if (tiptapRef.current?.toggleToolbar) {
                        tiptapRef.current.toggleToolbar();
                      }
                    }}
                  >
                    <span>Show Toolbar</span>
                    <div className="flex items-center gap-2">
                      {tiptapRef.current?.isToolbarVisible?.() && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                      <span className="keyboard-shortcut">
                        {(() => {
                          const settings = getSettings();
                          const hotkeys = getHotkeys(settings);
                          return formatHotkeyForDisplay(hotkeys.toggleToolbar || 'alt+t');
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Translucency option */}
                  <div className="py-2 px-4 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span>Translucency</span>
                      <span className="keyboard-shortcut">⌥⌘T</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-60">Solid</span>
                      <input
                        type="range"
                        min="0.3"
                        max="1"
                        step="0.05"
                        value={transparency}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value);
                          console.log('Setting transparency to:', newValue);
                          updateTransparency(newValue);
                        }}
                        className="w-full"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs opacity-60">Clear</span>
                    </div>
                    <div className="text-xs text-center mt-1 opacity-60">
                      {Math.round((1 - transparency) * 100)}% transparent
                    </div>
                  </div>

                  {/* Note Shortcut option */}
                  <div
                    className="menu-item py-2 px-4 cursor-pointer transition-colors"
                    onClick={() => {
                      // Show a message explaining that this feature is coming soon
                      alert('Note shortcuts will be available in a future update. This feature will allow you to assign custom keyboard shortcuts to specific notes.');
                      dispatch(updateUIState({ showSettingsMenu: false }));
                    }}
                  >
                    <span>Note Shortcut</span>
                    <span className="text-xs text-gray-400 ml-2">(Coming soon)</span>
                  </div>

                  {/* Divider */}
                  <div className="divider border-t my-1"></div>

                  {/* Background Color section */}
                  <div 
                    className="py-2 px-4 cursor-pointer hover:bg-black/5 transition-colors"
                    onClick={() => {
                      dispatch(updateUIState({ showSettingsMenu: false, showColorPicker: true }));
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="section-header">Background Color</span>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-5 h-5 rounded-full border border-black/20"
                          style={{ backgroundColor: noteColor }}
                          title="Current color"
                        />
                        <svg 
                          width="12" 
                          height="12" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{ color: `${getButtonColors().inactive}` }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="divider border-t my-1"></div>

                  {/* Save to File option */}
                  <div
                    className="menu-item py-2 px-4 cursor-pointer transition-colors"
                    onClick={async () => {
                      try {
                        // Get the current note data
                        const currentNote = currentNoteRef.current;
                        const currentContent = currentContentRef.current;

                        // Get the save location from settings
                        const settings = getSettings();
                        if (!settings.saveLocation) {
                          alert('No save location set. Please set a save location in Settings.');
                          return;
                        }

                        // Convert HTML content to Markdown for saving
                        const { htmlToMarkdown } = await import('../../shared/utils/markdownUtils');
                        const markdownContent = htmlToMarkdown(currentContent);

                        // Add title as H1 at the beginning
                        const titlePrefix = currentNote.title ? `# ${currentNote.title}\n\n` : '';
                        const fullContent = titlePrefix + markdownContent;

                        // Save to file
                        const result = await window.fileOps.saveNoteToFile(
                          currentNote.id,
                          currentNote.title,
                          fullContent,
                          settings.saveLocation
                        );

                        if (result.success) {
                          alert(`Note saved to ${result.filePath}`);
                        } else {
                          alert('Failed to save note to file.');
                        }

                        // Close the settings menu
                        dispatch(updateUIState({ showSettingsMenu: false }));
                      } catch (error) {
                        console.error('Error saving note to file:', error);
                        alert('Failed to save note to file. Please try again.');
                      }
                    }}
                  >
                    <span>Save to File</span>
                  </div>

                  {/* Move to Folder option */}
                  <div className="menu-item py-2 px-4 cursor-pointer transition-colors flex items-center justify-between">
                    <span>Move to Folder</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>

                  {/* Move to Trash option */}
                  <div
                    className="menu-item py-2 px-4 cursor-pointer transition-colors text-red-400"
                    onClick={async () => {
                      // Confirm before deleting
                      if (confirm(`Are you sure you want to move "${title}" to trash?`)) {
                        try {
                          // Get the note ID
                          const noteId = currentNoteRef.current.id;

                          // Delete the note
                          await deleteNote(noteId);

                          // Notify other windows that this note has been deleted
                          window.noteWindow.noteUpdated(noteId, { deleted: true });

                          // Close the window
                          window.windowControls.close();
                        } catch (error) {
                          console.error('Error deleting note:', error);
                          alert('Failed to delete note. Please try again.');
                        }
                      }
                    }}
                  >
                    <span>Move to Trash</span>
                  </div>

                  {/* Divider */}
                  <div className="divider border-t my-1"></div>

                  {/* Settings option */}
                  <div
                    className="menu-item py-2 px-4 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={() => {
                      // Open settings window
                      window.settings.openSettings();
                      // Close the settings menu
                      dispatch(updateUIState({ showSettingsMenu: false }));
                    }}
                  >
                    <span>Settings...</span>
                    <span className="keyboard-shortcut">⌘,</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-hidden flex flex-col"
        style={{
          backgroundColor: noteColor,
          color: getTextColor(),
          '--dynamic-text-color': getTextColor()
        } as React.CSSProperties & { '--dynamic-text-color': string }}
        onMouseEnter={() => {
          const tiptapContent = document.querySelector('.note-editor .tiptap-content');
          const proseMirror = document.querySelector('.note-editor .ProseMirror');
          
          const tiptapStyles = tiptapContent ? window.getComputedStyle(tiptapContent) : null;
          const proseMirrorStyles = proseMirror ? window.getComputedStyle(proseMirror) : null;
          
          console.log('DOM inspection:', {
            backgroundColor: noteColor,
            calculatedTextColor: getTextColor(),
            theme: theme,
            tiptapContentComputedColor: tiptapStyles?.color,
            proseMirrorComputedColor: proseMirrorStyles?.color,
            tiptapContentClasses: tiptapContent?.className,
            proseMirrorClasses: proseMirror?.className,
            documentThemeClass: document.documentElement.className,
            // Additional style properties that might affect appearance
            tiptapTextShadow: tiptapStyles?.textShadow,
            proseMirrorTextShadow: proseMirrorStyles?.textShadow,
            tiptapOpacity: tiptapStyles?.opacity,
            proseMirrorOpacity: proseMirrorStyles?.opacity,
            tiptapFilter: tiptapStyles?.filter,
            proseMirrorFilter: proseMirrorStyles?.filter
          });
        }}
      >
        <Tiptap
          ref={tiptapRef}
          content={content}
          onUpdate={handleContentUpdate}
          placeholder="Start typing here..."
          autofocus={!isNewNote}
          editorClass={getTextColorForBackground(noteColor) === '#ffffff' ? 'dark-theme' : ''}
          backgroundColor={noteColor}
          textColor={getTextColor()}
          toolbarColor={getDarkerShade(noteColor)}
        />
      </div>

      {/* Keep the shadow effect at the top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-b from-black/10 to-transparent z-10"></div>

      {/* Hotkeys */}
      <NoteHotkeys
        settings={appSettings}
        note={currentNoteRef.current}
        onSave={handleManualSave}
        onTogglePin={togglePinState}
        onDelete={() => {
          // Implement delete functionality if needed
          console.log('Delete hotkey pressed');
        }}
        onChangeColor={() => {
          // Toggle color picker
          dispatch(updateUIState({ showColorPicker: !showColorPicker }));
        }}
      />
      
      {/* Color picker using shared component */}
      <ColorPicker
        isOpen={showColorPicker}
        onClose={() => dispatch(updateUIState({ showColorPicker: false }))}
        currentColor={noteColor}
        onColorSelect={(color) => changeNoteColor(color)}
        title="Note Background"
      />
    </div>
  );
};

export default NoteEditor;
