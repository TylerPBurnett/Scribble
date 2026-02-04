import React, { useState, useEffect, useCallback } from 'react';
import { Note } from '../../shared/types/Note';
import { getDefaultNoteColorForTheme, NOTE_COLOR_OPTIONS } from '../../shared/constants/colors';
import { useTheme } from '../../shared/services/themeService';
import { getSettings } from '../../shared/services/settingsService';
import { getHotkeys, formatHotkeyForDisplay } from '../../shared/services/hotkeyService';

interface NoteSettingsWindowProps {}

export const NoteSettingsWindow: React.FC<NoteSettingsWindowProps> = () => {
  const { theme } = useTheme();
  const [noteId, setNoteId] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [noteColor, setNoteColor] = useState<string>('');
  const [transparency, setTransparency] = useState<number>(1.0); // Keep as decimal for compatibility
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(true);

  // Get note ID from window context or URL
  useEffect(() => {
    const extractNoteId = () => {
      // First try to get from window context (set by preload script)
      if (window.NOTE_ID) {
        return window.NOTE_ID;
      }

      // Fallback to URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const noteIdFromUrl = urlParams.get('noteId');
      if (noteIdFromUrl) {
        return noteIdFromUrl;
      }

      // Last resort - try command line args if available
      if (process?.argv) {
        const noteIdArg = process.argv.find(arg => arg.startsWith('--note-id='));
        if (noteIdArg) {
          return noteIdArg.split('=')[1];
        }
      }

      return null;
    };

    const id = extractNoteId();
    console.log('Note Settings Window - Extracted note ID:', id);
    setNoteId(id);
  }, []);

  // Load note data and current settings
  useEffect(() => {
    if (!noteId) {
      setLoading(false);
      return;
    }

    const loadNoteData = async () => {
      try {
        console.log('Loading note data for ID:', noteId);

        // Try to get transient new note data first
        let noteData = await window.ipcRenderer.invoke('get-transient-new-note-data', noteId);
        
        if (!noteData) {
          // Try to get saved note data
          noteData = await window.ipcRenderer.invoke('get-note-by-id', noteId);
        }

        if (noteData) {
          console.log('Loaded note data:', noteData);
          setNote(noteData);
          setNoteColor(noteData.color || getDefaultNoteColorForTheme(theme));
          setIsFavorite(noteData.isFavorite || false);
          
          // Get transparency from parent note window
          try {
            const transparencyValue = await window.ipcRenderer.invoke('get-note-window-transparency', noteId) || 1.0;
            setTransparency(transparencyValue);
            console.log('Got parent note window transparency:', transparencyValue);
          } catch (error) {
            console.error('Error getting transparency:', error);
            setTransparency(1.0);
          }

          // Get pin state from parent note window
          try {
            const pinState = await window.ipcRenderer.invoke('get-note-window-pin', noteId) || false;
            setIsPinned(pinState);
            console.log('Got parent note window pin state:', pinState);
          } catch (error) {
            console.error('Error getting pin state:', error);
            setIsPinned(false);
          }

          // Get toolbar visibility from parent note window
          try {
            const toolbarVisible = await window.ipcRenderer.invoke('get-note-window-toolbar-state', noteId) || true;
            setIsToolbarVisible(toolbarVisible);
            console.log('Got parent note window toolbar state:', toolbarVisible);
          } catch (error) {
            console.error('Error getting toolbar state:', error);
            setIsToolbarVisible(true);
          }
        } else {
          console.warn('No note data found for ID:', noteId);
        }
      } catch (error) {
        console.error('Error loading note data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNoteData();
  }, [noteId, theme]);

  // Handle color change
  const handleColorChange = useCallback(async (color: string) => {
    if (!noteId || !note) return;

    try {
      setNoteColor(color);

      // Update the note in the main window
      await window.ipcRenderer.invoke('update-note-property', noteId, 'color', color);
      
      // Send color change to parent note window to update its background
      await window.ipcRenderer.invoke('set-note-window-color', noteId, color);
      
      // Broadcast the update to other windows
      window.ipcRenderer.send('note-updated', noteId, { color });
      
      console.log('Updated note color to:', color);
    } catch (error) {
      console.error('Error updating note color:', error);
    }
  }, [noteId, note]);

  // Handle transparency change
  const handleTransparencyChange = useCallback(async (value: number) => {
    try {
      setTransparency(value);
      
      // Send transparency change to parent note window, not this settings window
      if (noteId) {
        await window.ipcRenderer.invoke('set-note-window-transparency', noteId, value);
        console.log('Updated parent note window transparency to:', value, `(${Math.round(value * 100)}%)`);
      }
    } catch (error) {
      console.error('Error updating transparency:', error);
    }
  }, [noteId]);

  // Handle toolbar toggle
  const handleToolbarToggle = useCallback(() => {
    try {
      // This would need to communicate with the parent note window
      // For now, we'll just track the state locally
      const newState = !isToolbarVisible;
      setIsToolbarVisible(newState);
      
      // Send message to parent note window to toggle toolbar
      if (noteId) {
        window.ipcRenderer.send('toggle-note-toolbar', noteId, newState);
      }
      
      console.log('Updated toolbar visibility to:', newState);
    } catch (error) {
      console.error('Error toggling toolbar:', error);
    }
  }, [isToolbarVisible, noteId]);

  // Handle pin toggle
  const handlePinToggle = useCallback(async () => {
    try {
      const newPinState = !isPinned;
      setIsPinned(newPinState);
      
      // Set pin state on the parent note window, not this settings window
      if (noteId) {
        await window.ipcRenderer.invoke('set-note-window-pin', noteId, newPinState);
        console.log('Updated parent note window pin state to:', newPinState);
      }
    } catch (error) {
      console.error('Error updating pin state:', error);
    }
  }, [isPinned, noteId]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(async () => {
    if (!noteId || !note) return;

    try {
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);

      // Update the note
      await window.ipcRenderer.invoke('update-note-property', noteId, 'isFavorite', newFavoriteState);
      
      // Broadcast the update
      window.ipcRenderer.send('note-updated', noteId, { isFavorite: newFavoriteState });
      
      console.log('Updated favorite state to:', newFavoriteState);
    } catch (error) {
      console.error('Error updating favorite state:', error);
    }
  }, [noteId, note, isFavorite]);

  // Handle window close
  const handleClose = useCallback(() => {
    if (noteId) {
      window.ipcRenderer.invoke('close-note-settings', noteId);
    }
  }, [noteId]);

  // Handle save to file
  const handleSaveToFile = useCallback(async () => {
    if (!noteId || !note) return;

    try {
      const result = await window.ipcRenderer.invoke('save-note-to-file', 
        note.title, 
        note.content, 
        undefined, // saveLocation - let it use default
        note.title // oldTitle
      );

      if (result.success) {
        console.log('Note saved to file successfully');
        // Close the settings window after successful save
        handleClose();
      } else {
        console.error('Failed to save note to file:', result.error);
        alert('Failed to save note to file. Please try again.');
      }
    } catch (error) {
      console.error('Error saving note to file:', error);
      alert('Failed to save note to file. Please try again.');
    }
  }, [noteId, note, handleClose]);

  // Handle delete note
  const handleDeleteNote = useCallback(async () => {
    if (!noteId || !note) return;

    const confirmed = confirm(`Are you sure you want to delete "${note.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await window.ipcRenderer.invoke('delete-note', noteId);
      console.log('Note deleted successfully');
      handleClose();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  }, [noteId, note, handleClose]);

  if (loading) {
    return (
      <div className="note-settings-window">
        <div className="note-settings-titlebar">
          <div className="note-settings-title">Loading...</div>
        </div>
        <div className="note-settings-content">
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            Loading note settings...
          </div>
        </div>
      </div>
    );
  }

  if (!noteId || !note) {
    return (
      <div className="note-settings-window">
        <div className="note-settings-titlebar">
          <div className="note-settings-title">Error</div>
        </div>
        <div className="note-settings-content">
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--destructive)' }}>
            Could not load note settings
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="note-settings-window">
      <div className="note-settings-titlebar">
        <div className="note-settings-title">Note Settings</div>
        <button className="close-button" onClick={handleClose}>
          ×
        </button>
      </div>
      
      <div className="note-settings-content">
        {/* Favorite option */}
        <div className="settings-toggle-item">
          <span>Favorite</span>
          <div className="flex items-center gap-2">
            {isFavorite && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
            <span className="keyboard-shortcut">⌥⌘S</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isFavorite} 
                onChange={handleFavoriteToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Pin window option */}
        <div className="settings-toggle-item">
          <span>Float on Top</span>
          <div className="flex items-center gap-2">
            {isPinned && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
            <span className="keyboard-shortcut">⌥⌘F</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isPinned} 
                onChange={handlePinToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Toolbar toggle option */}
        <div className="settings-toggle-item">
          <span>Show Toolbar</span>
          <div className="flex items-center gap-2">
            {isToolbarVisible && (
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
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isToolbarVisible} 
                onChange={handleToolbarToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-divider"></div>

        {/* Window Transparency */}
        <div className="settings-section-header">Translucency</div>
        <div style={{ padding: '12px 16px' }}>
          <div className="flex items-center justify-between mb-1">
            <span>Translucency</span>
            <span className="keyboard-shortcut">⌥⌘T</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs opacity-60">Solid</span>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={transparency}
              onChange={(e) => handleTransparencyChange(parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-xs opacity-60">Clear</span>
          </div>
          <div className="text-xs text-center opacity-60">
            {Math.round((1 - transparency) * 100)}% transparent
          </div>
        </div>

        {/* Note Shortcut */}
        <button 
          className="settings-menu-item"
          onClick={() => {
            alert('Note shortcuts will be available in a future update. This feature will allow you to assign custom keyboard shortcuts to specific notes.');
          }}
        >
          <span>Note Shortcut</span>
          <span className="text-xs text-gray-400 ml-2">(Coming soon)</span>
        </button>

        <div className="settings-divider"></div>

        {/* Background Color */}
        <div className="settings-section-header">Background Color</div>
        <div className="color-grid">
          {NOTE_COLOR_OPTIONS.map((colorOption) => (
            <button
              key={colorOption.value}
              className={`color-option ${noteColor === colorOption.value ? 'selected' : ''}`}
              style={{ backgroundColor: colorOption.value }}
              onClick={() => handleColorChange(colorOption.value)}
              title={`Set background to ${colorOption.name}`}
            />
          ))}
        </div>

        <div className="settings-divider"></div>

        {/* Actions */}
        <div className="settings-section-header">Actions</div>
        
        <button className="settings-menu-item" onClick={handleSaveToFile}>
          <span>Save to File</span>
        </button>

        <button 
          className="settings-menu-item"
          onClick={() => {
            alert('Move to Folder functionality will be available in a future update. This will allow you to organize notes into different folders.');
          }}
        >
          <span>Move to Folder</span>
          <span className="text-xs text-gray-400 ml-2">(Coming soon)</span>
        </button>

        <button className="settings-menu-item destructive" onClick={handleDeleteNote}>
          <span>Move to Trash</span>
        </button>

        <div className="settings-divider"></div>

        {/* Settings option */}
        <button
          className="settings-menu-item"
          onClick={() => {
            window.settings?.openSettings();
          }}
        >
          <span>Settings...</span>
          <span className="keyboard-shortcut">⌘,</span>
        </button>
      </div>
    </div>
  );
};