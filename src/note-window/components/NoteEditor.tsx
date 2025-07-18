import { useState, useEffect, useRef, useCallback } from 'react';
import { Note } from '../../shared/types/Note';
import Tiptap, { TiptapRef } from './Tiptap';
import { updateNote, deleteNote } from '../../shared/services/noteService';
import { getSettings, subscribeToSettingsChanges, AppSettings } from '../../shared/services/settingsService';
import { NoteHotkeys } from './NoteHotkeys';
import { useDebounce } from '../../shared/hooks/useDebounce';
import './NoteEditor.css';
import './SettingsMenu.css';

interface NoteEditorProps {
  note: Note;
  onSave?: (note: Note) => void;
  onChange?: (note: Note) => void;
}

const NoteEditor = ({ note, onSave, onChange }: NoteEditorProps) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isDirty, setIsDirty] = useState(false);
  const [isPinned, setIsPinned] = useState(note.pinned || false);
  const [isFavorite, setIsFavorite] = useState(note.favorite || false);
  const [noteColor, setNoteColor] = useState(note.color || '#fff9c4'); // Default yellow sticky note color
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [transparency, setTransparency] = useState(note.transparency || 1); // Default to fully opaque

  // Track if we're currently editing the title to prevent premature saves
  const [isTitleFocused, setIsTitleFocused] = useState(false);

  // Store the temporary title value while editing
  const [tempTitle, setTempTitle] = useState(note.title);

  // Get settings for auto-save and hotkeys
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5000);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    saveLocation: '',
    autoSave: true,
    autoSaveInterval: 5,
    theme: 'dim',
  });

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
  }, [title, content, onChange]);

  // Load settings on component mount and subscribe to changes
  useEffect(() => {
    // Initial settings load
    const settings = getSettings();
    setAppSettings(settings);
    setAutoSaveEnabled(settings.autoSave);
    setAutoSaveInterval(settings.autoSaveInterval * 1000); // Convert to milliseconds

    // Subscribe to settings changes
    const unsubscribe = subscribeToSettingsChanges((newSettings) => {
      console.log('Settings changed in NoteEditor:', newSettings);
      setAppSettings(newSettings);
      setAutoSaveEnabled(newSettings.autoSave);
      setAutoSaveInterval(newSettings.autoSaveInterval * 1000);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Define a stable save function that uses refs to access the latest state
  const saveNote = useCallback(async () => {
    // Early return if not dirty to prevent unnecessary saves
    if (!isDirtyRef.current) return;

    const note = currentNoteRef.current;
    const title = currentTitleRef.current;
    const content = currentContentRef.current;

    if (!note) return;

    const updatedNote = {
      ...note,
      title: title,
      content: content,
      _isNew: undefined // Clear the new note flag
    };

    try {
      console.log('NoteEditor - Saving note:', updatedNote.id);
      const savedNote = await updateNote(updatedNote);
      console.log('NoteEditor - Note saved:', savedNote);

      // Update the note reference with the saved note
      // This is crucial for subsequent renames to work correctly
      currentNoteRef.current = savedNote;
      console.log('NoteEditor - Updated note reference:', currentNoteRef.current);

      onSave?.(savedNote);

      // Notify other windows that this note has been updated
      // Use the saved note ID which might have changed if the title was changed
      window.noteWindow.noteUpdated(savedNote.id, { title: savedNote.title });

      // Reset dirty state after successful save
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving note:', error);
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

  // Track if this is a new note that hasn't been saved yet
  const [isNewNote, setIsNewNote] = useState(note._isNew === true || (note.title === 'Untitled Note' && note.content === '<p></p>'));

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
      setIsNewNote(false);
    }
  }, [title, isNewNote]);

  // Check if content has changed from the last saved version
  useEffect(() => {
    // Only mark as dirty when:
    // 1. Not currently editing the title (to prevent premature saves)
    // 2. Content has actually changed from the last saved version
    if (!isTitleFocused && content !== currentNoteRef.current.content) {
      console.log('Content changed and not focused, marking as dirty');
      setIsDirty(true);
    }
  }, [content, isTitleFocused, currentNoteRef]);

  // Check if title has changed from the last saved version
  useEffect(() => {
    // Only mark as dirty when title has changed from the last saved version
    if (title !== currentNoteRef.current.title) {
      console.log('Title changed from saved version, marking as dirty');
      setIsDirty(true);
    }
  }, [title, currentNoteRef]);

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

  // Dragging functionality
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Allow dragging from the title bar, but not from input fields or buttons
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT';
    const isButton = target.tagName === 'BUTTON' || target.closest('button');
    const isSvg = target.tagName === 'svg' || target.tagName === 'path' || target.closest('svg');

    if (!isInput && !isButton && !isSvg) {
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
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

  const handleClose = () => {
    window.windowControls.close();
  };

  // Handle title blur - process title changes when focus is lost
  const handleTitleBlur = useCallback(() => {
    // When focus is lost, apply the title change if it's valid
    setIsTitleFocused(false);

    // Only apply the change if the title is not empty and not the default
    if (tempTitle && tempTitle.trim() !== '') {
      if (tempTitle !== title) {
        console.log('Applying title change on blur:', tempTitle);
        setTitle(tempTitle);

        // If this was a new note, mark it as no longer new
        if (isNewNote && tempTitle !== 'Untitled Note') {
          setIsNewNote(false);
        }
      } else {
        console.log('Title unchanged, not marking as dirty');
      }
    } else {
      console.log('Not applying empty title on blur');
      // Reset to the previous title if empty
      setTempTitle(title);
    }
  }, [tempTitle, title, isNewNote]);

  // Manual save function
  const handleManualSave = () => {
    console.log('Manual save triggered');
    saveNote();
  };

  // Content update handler
  const handleContentUpdate = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Update note transparency
  const updateTransparency = useCallback(async (value: number) => {
    try {
      console.log('Updating transparency to:', value);

      // Update state immediately for UI feedback
      setTransparency(value);

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
        setIsPinned(isWindowPinned);
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
  }, [transparency]); // Include transparency as a dependency

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
        setIsFavorite(newFavoriteState);

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
          setShowSettingsMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  // Define color options
  const colorOptions = [
    { name: 'Yellow', value: '#fff9c4' }, // Default sticky note color
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#333333' },
    { name: 'Pastel Green', value: '#d0f0c0' },
    { name: 'Pastel Blue', value: '#b5d8eb' },
    { name: 'Pastel Purple', value: '#d8c2ef' },
    { name: 'Pastel Pink', value: '#f4c2c2' },
    { name: 'Pastel Gray', value: '#d3d3d3' }
  ];

  // Toggle pin state
  const togglePinState = async () => {
    try {
      const newPinState = !isPinned;
      const result = await window.windowControls.togglePin(newPinState);
      setIsPinned(result);

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
  };

  // Change note color
  const changeNoteColor = async (color: string) => {
    try {
      setNoteColor(color);
      setShowSettingsMenu(false);

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
  };

  // Function to darken a color for the header
  const getDarkerShade = (color: string): string => {
    // For specific colors, return predefined darker shades
    if (color === '#ffffff') return '#f8f8f8';
    if (color === '#333333') return '#333333'; // Match the body color for black
    if (color === '#fff9c4') return '#fff5b1';

    // For pastel gray, return the same color (no darkening)
    if (color === '#d3d3d3') return color;

    // For other colors, calculate a slightly darker shade
    try {
      // Parse the hex color
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      // Darken by 10%
      const darkenFactor = 0.9;
      const newR = Math.floor(r * darkenFactor);
      const newG = Math.floor(g * darkenFactor);
      const newB = Math.floor(b * darkenFactor);

      // Convert back to hex
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error darkening color:', error);
      return color; // Return original color if there's an error
    }
  };

  // Determine text color based on background color
  const getTextColor = () => {
    // For dark backgrounds, use white text
    if (noteColor === '#333333') {
      return '#ffffff';
    }
    // For all other colors (including pastel gray), use black text
    return '#333333';
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
          backgroundColor: noteColor === '#333333' ? '#21222C' : getDarkerShade(noteColor)
        }}
      >
        <div className="flex items-center justify-between w-full">
          {/* Left side: Window controls */}
          <div className="flex items-center gap-2">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="w-6 h-6 rounded-full bg-gray-500/20 hover:bg-red-500 flex items-center justify-center transition-colors"
              title="Close note"
              style={{ WebkitAppRegion: 'no-drag' }}
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
              className="w-6 h-6 rounded-full bg-gray-500/20 hover:bg-gray-500/50 flex items-center justify-center transition-colors"
              title="Minimize"
              style={{ WebkitAppRegion: 'no-drag' }}
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
              className={`note-title-input text-sm font-medium bg-transparent border-none outline-none focus:outline-none focus:ring-0 font-['Chirp',_'Segoe_UI',_sans-serif] cursor-text caret-black text-center ${isTitleFocused ? 'ring-1 ring-blue-400/30 bg-white/10' : ''}`}
              style={{
                WebkitAppRegion: 'no-drag',
                boxShadow: 'none',
                borderRadius: isTitleFocused ? '4px' : '0px',
                padding: isTitleFocused ? '2px 6px' : '2px 0px',
                width: isTitleFocused ?
                  `${Math.min(Math.max((tempTitle?.length || 1) * 8, 50), 250)}px` :
                  `${Math.min(Math.max((title?.length || 1) * 8, 50), 250)}px`
              }}
              ref={titleInputRef}
              value={isTitleFocused ? tempTitle : title}
              onChange={(e) => {
                // Only update the temporary title while editing
                // This won't trigger any saves
                const newTitle = e.target.value;
                console.log('Title input change (temp):', newTitle);
                setTempTitle(newTitle);
              }}
              onFocus={() => {
                // When focusing, set the temporary title to the current title
                setTempTitle(title);
                setIsTitleFocused(true);
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
                className="text-black/50 hover:text-blue-600 transition-colors p-1 cursor-pointer"
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
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={`settings-button transition-colors p-1 cursor-pointer ${
                  showSettingsMenu ? 'text-blue-600' : 'text-black/50 hover:text-blue-600'
                }`}
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
                        setIsFavorite(newFavoriteState);

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
                      setShowSettingsMenu(false);
                    }}
                  >
                    <span>Note Shortcut</span>
                    <span className="text-xs text-gray-400 ml-2">(Coming soon)</span>
                  </div>

                  {/* Divider */}
                  <div className="divider border-t my-1"></div>

                  {/* Background Color section */}
                  <div className="py-2 px-4">
                    <div className="section-header">Background Color</div>
                    <div className="grid grid-cols-8 gap-1">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          className={`color-button w-6 h-6 rounded-full ${
                            noteColor === color.value ? 'selected' : ''
                          }`}
                          style={{
                            backgroundColor: color.value
                          }}
                          title={color.name}
                          onClick={() => changeNoteColor(color.value)}
                        />
                      ))}
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
                        setShowSettingsMenu(false);
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
                      setShowSettingsMenu(false);
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
          color: getTextColor()
        }}
      >
        <Tiptap
          ref={tiptapRef}
          content={content}
          onUpdate={handleContentUpdate}
          placeholder="Start typing here..."
          autofocus={!isNewNote}
          editorClass={noteColor === '#333333' ? 'dark-theme' : ''}
          backgroundColor={noteColor}
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
          setShowColorPicker(!showColorPicker);
        }}
      />
    </div>
  );
};

export default NoteEditor;
