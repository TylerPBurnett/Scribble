import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Note } from '../../shared/types/Note';
import { deleteNote, updateNote } from '../../shared/services/noteService';
import NoteCollectionManager from './NoteCollectionManager';
import { useNoteCardPerformance } from '../../shared/hooks/useExpensiveOperations';
import { useRenderPerformance, useMemoizationTracking } from '../../shared/hooks/usePerformanceMonitoring';
import { ColorPicker } from '../../shared/components/ColorPicker';
import { getNoteColorStyle } from '../../shared/constants/colors';

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  isActive?: boolean;
  onDelete?: (noteId: string) => void;
  isPinned?: boolean;
  isFavorite?: boolean;
  onCollectionUpdate?: () => void;
  allNotes?: Note[]; // Add allNotes prop for collection count updates
}

// Custom comparison function for React.memo
const areNoteCardPropsEqual = (prevProps: NoteCardProps, nextProps: NoteCardProps): boolean => {
  // Compare note object properties that affect rendering
  if (prevProps.note.id !== nextProps.note.id) return false;
  if (prevProps.note.title !== nextProps.note.title) return false;
  if (prevProps.note.content !== nextProps.note.content) return false;
  if (prevProps.note.color !== nextProps.note.color) return false;
  if (prevProps.note.favorite !== nextProps.note.favorite) return false;
  if (prevProps.note.pinned !== nextProps.note.pinned) return false;
  if (prevProps.note.updatedAt?.getTime() !== nextProps.note.updatedAt?.getTime()) return false;
  
  // Compare other props
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.isPinned !== nextProps.isPinned) return false;
  if (prevProps.isFavorite !== nextProps.isFavorite) return false;
  
  // Function props are assumed to be stable (wrapped with useCallback in parent)
  // We don't compare them as they should maintain referential equality
  
  return true;
};

const NoteCard = ({ note, onClick, isActive = false, onDelete, isPinned = false, isFavorite = false, onCollectionUpdate, allNotes = [] }: NoteCardProps) => {
  // Performance monitoring
  const componentName = `NoteCard-${note.id}`;
  const { measureOperation } = useNoteCardPerformance(componentName);
  useRenderPerformance(componentName);
  useMemoizationTracking(componentName, [
    note.id, note.title, note.content, note.color, note.favorite, note.pinned, 
    note.updatedAt?.getTime(), isActive, isPinned, isFavorite
  ]);

  // Consolidated menu state management
  const [menuState, setMenuState] = useState({
    showMenu: false,
    showColorPicker: false,
    showConfirmDelete: false,
    showCollectionManager: false,
    menuPosition: { x: 0, y: 0 },
    isContextMenu: false,
    isAnimating: false,
  });

  // Helper functions for updating consolidated state
  const updateMenuState = (updates: Partial<typeof menuState>) => {
    setMenuState(prev => ({ ...prev, ...updates }));
  };

  // Destructure for easier access
  const { showMenu, showColorPicker, showConfirmDelete, showCollectionManager, menuPosition, isContextMenu, isAnimating } = menuState;
  // Refs for DOM elements
  const noteCardRef = useRef<HTMLDivElement>(null);

  // Effect to handle context menu
  useEffect(() => {
    // Function to close the menu when clicking anywhere
    const handleGlobalClick = () => {
      if (showMenu) {
        updateMenuState({ showMenu: false, isContextMenu: false });
      }
    };

    // Add global click listener to close menu
    if (showMenu) {
      // Add with a slight delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        window.addEventListener('click', handleGlobalClick);
      }, 50);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('click', handleGlobalClick);
      };
    }

    return undefined;
  }, [showMenu]);

  // We don't need a separate effect for clicks outside the color picker
  // since our overlay handles this with its own click handler



  // Check if the note is favorited or pinned
  const isFavoriteNote = isFavorite || note.favorite;
  const isPinnedNote = isPinned || note.pinned;

  // Toggle dropdown menu
  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the note click
    updateMenuState({ showMenu: !showMenu, isContextMenu: false });
  }, [showMenu]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Prevent default browser context menu and note click
    e.preventDefault();
    e.stopPropagation();

    // Close any existing menu first
    updateMenuState({ showMenu: false, isContextMenu: false, showColorPicker: false });

    // Calculate position, ensuring menu stays within viewport
    const x = Math.min(e.clientX, window.innerWidth - 160);
    const y = Math.min(e.clientY, window.innerHeight - 200);

    // Use setTimeout to ensure state updates happen after current event cycle
    setTimeout(() => {
      updateMenuState({ 
        menuPosition: { x, y }, 
        isContextMenu: true, 
        showMenu: true 
      });
    }, 0);

    // Stop event propagation
    return false;
  }, []);

  // Handle delete button click
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the note click
    updateMenuState({ showMenu: false, showConfirmDelete: true });
  }, []);

  // Handle confirm delete
  const handleConfirmDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the note click
    await measureOperation('note-delete-handler', async () => {
      if (onDelete) {
        onDelete(note.id);
      } else {
        // Fallback if onDelete prop is not provided
        console.log('NoteCard - Deleting note (fallback):', note.id);
        try {
          await deleteNote(note.id);
          console.log('NoteCard - Note deleted');
          // Notify other windows that this note has been deleted
          window.noteWindow.noteUpdated(note.id);
          // Reload notes (this is not ideal, but works as a fallback)
          window.location.reload();
        } catch (error) {
          console.error('Error deleting note:', error);
        }
      }
    });
  }, [onDelete, note.id, measureOperation]);

  // Handle cancel delete
  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the note click
    updateMenuState({ showConfirmDelete: false });
  }, []);

  // Handle note click with Apple-style animation
  const handleNoteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Don't animate if menu is open or if already animating
    if (showMenu || isAnimating) return;
    
    // Measure click handling performance
    await measureOperation('note-click-handler', async () => {
      // Start animation
      updateMenuState({ isAnimating: true });
      
      // Small delay to show the scale-down effect
      setTimeout(async () => {
        try {
          await onClick(note);
        } finally {
          // Reset animation state after a delay
          setTimeout(() => {
            updateMenuState({ isAnimating: false });
          }, 150);
        }
      }, 100);
    });
  }, [showMenu, isAnimating, onClick, note, measureOperation]);

  // Format date to display
  const formatDate = (date: Date) => {
    // Calculate time ago (similar to formatDistanceToNow from date-fns)
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    // Fall back to standard date format for older dates
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Get a preview of the content (strip HTML and limit length)
  const getContentPreview = (content: string) => {
    // Remove HTML tags but preserve line breaks and basic formatting
    const plainText = content
      .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
      .replace(/<p[^>]*>/gi, '')      // Remove opening <p> tags
      .replace(/<\/p>/gi, '\n')       // Convert closing </p> tags to newlines
      .replace(/<h[1-6][^>]*>/gi, '') // Remove opening heading tags
      .replace(/<\/h[1-6]>/gi, '\n')  // Convert closing heading tags to newlines
      .replace(/<li[^>]*>/gi, '• ')   // Convert list items to bullets
      .replace(/<\/li>/gi, '\n')      // Add newlines after list items
      .replace(/<[^>]*>/g, '');       // Remove all other HTML tags

    // Limit to 180 characters for more content display
    return plainText.length > 180 ? plainText.substring(0, 180) + '...' : plainText;
  };

  // Get note color styling using shared function
  const colorStyle = getNoteColorStyle(note.color);

  return (
    <>
      {/* Context Menu Overlay - rendered at the root level */}
      {showMenu && isContextMenu && (
        <div
          className="fixed inset-0 z-[9998] bg-transparent"
          onClick={() => {
            updateMenuState({ showMenu: false, isContextMenu: false });
          }}
        >
          <div
            className="fixed bg-popover rounded-md shadow-[0_5px_15px_rgba(0,0,0,0.3)] z-[9999] min-w-[140px] overflow-hidden border border-border text-xs font-twitter"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              top: menuPosition.y,
              left: menuPosition.x,
            }}
          >
            <button
              className="flex items-center gap-1.5 w-full px-2.5 py-1.5 bg-transparent border-none text-text-secondary text-left cursor-pointer transition-colors hover:bg-background-notes/20"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateMenuState({ showMenu: false, isContextMenu: false });
                // Small delay to ensure menu is closed before action
                setTimeout(() => {
                  onClick(note); // Open the note for editing
                }, 10);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit</span>
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-text-secondary text-left cursor-pointer transition-colors hover:bg-background-notes/30"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateMenuState({ showMenu: false, isContextMenu: false });
                // Small delay to ensure menu is closed before action
                setTimeout(() => {
                  console.log('Duplicate note:', note.id);
                }, 10);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Duplicate</span>
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-text-secondary text-left cursor-pointer transition-colors hover:bg-background-notes/30"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateMenuState({ showMenu: false, isContextMenu: false });
                // Small delay to ensure menu is closed before action
                setTimeout(() => {
                  updateMenuState({ showCollectionManager: true });
                }, 10);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Organize</span>
            </button>
            <button
              className={`flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none ${isFavoriteNote ? 'text-text' : 'text-text-secondary'} text-left cursor-pointer transition-colors hover:bg-background-notes/30`}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateMenuState({ showMenu: false, isContextMenu: false });
                // Small delay to ensure menu is closed before action
                setTimeout(() => {
                  // Toggle favorite state
                  // Create a deep copy of the note to ensure we don't lose any properties
                  const updatedNote = {
                    ...note,
                    favorite: !isFavoriteNote,
                    // Ensure content is preserved exactly as it was
                    content: note.content
                  };
                  // Update the note in the database
                  updateNote(updatedNote).then(() => {
                    // Notify other windows that this note has been updated with the specific property
                    // This allows the main window to update its state without a full reload
                    window.noteWindow.noteUpdated(note.id, { favorite: !isFavoriteNote });
                    
                    // PERMANENT FIX: Use the onCollectionUpdate callback to trigger parent refresh
                    // This directly tells the parent component to refresh its state
                    if (onCollectionUpdate) {
                      console.log('NoteCard - Calling onCollectionUpdate to refresh parent state');
                      onCollectionUpdate();
                    }
                  });
                }, 10);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={isFavoriteNote ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              <span>{isFavoriteNote ? 'Unfavorite' : 'Favorite'}</span>
            </button>

            <button
              className={`flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none ${isPinnedNote ? 'text-text' : 'text-text-secondary'} text-left cursor-pointer transition-colors hover:bg-background-notes/30`}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateMenuState({ showMenu: false, isContextMenu: false });
                // Small delay to ensure menu is closed before action
                setTimeout(() => {
                  // Toggle pin state
                  // Create a deep copy of the note to ensure we don't lose any properties
                  const updatedNote = {
                    ...note,
                    pinned: !isPinnedNote,
                    // Ensure content is preserved exactly as it was
                    content: note.content
                  };
                  // Update the note in the database
                  updateNote(updatedNote).then(() => {
                    // Notify other windows that this note has been updated with the specific property
                    // This allows the main window to update its state without a full reload
                    window.noteWindow.noteUpdated(note.id, { pinned: !isPinnedNote });
                    
                    // PERMANENT FIX: Use the onCollectionUpdate callback to trigger parent refresh
                    // This directly tells the parent component to refresh its state
                    if (onCollectionUpdate) {
                      console.log('NoteCard - Calling onCollectionUpdate to refresh parent state');
                      onCollectionUpdate();
                    }
                  });
                }, 10);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={isPinnedNote ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{isPinnedNote ? 'Remove Float' : 'Float on Top'}</span>
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-text-secondary text-left cursor-pointer transition-colors hover:bg-background-notes/30"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateMenuState({ showMenu: false, isContextMenu: false });
                // Small delay to ensure menu is closed before action
                setTimeout(() => {
                  updateMenuState({ showColorPicker: true });
                }, 10);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4"></circle>
              </svg>
              <span>Change Color</span>
            </button>
            <button
              className="delete-action flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-danger text-left cursor-pointer transition-colors hover:bg-background-notes/30"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateMenuState({ showMenu: false, isContextMenu: false });
                // Small delay to ensure menu is closed before action
                setTimeout(() => {
                  handleDeleteClick(e);
                }, 10);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      <div
        ref={noteCardRef}
        className={`note-card ${isActive ? 'selected' : ''} ${isAnimating ? 'scale-95 opacity-90' : ''} rounded-xl overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer h-note-card
          hover:translate-y-[-2px] hover:scale-[1.02] group ease-out`}
        onClick={handleNoteClick}
        tabIndex={-1}
        onContextMenu={handleContextMenu}
        style={{
          backgroundColor: colorStyle.backgroundColor,
          color: colorStyle.color
        }}
      >
      {/* Note Header */}
      <div
        className="note-header px-3 py-2 flex items-center justify-between border-b border-black/5"
        style={{ backgroundColor: colorStyle.headerBg || '' }}
      >
        <h3 className="note-title text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] font-twitter">
          {note.title || 'Untitled Note'}
        </h3>
        <div className="note-actions flex items-center gap-1 relative">
          {/* Favorite icon */}
          {isFavoriteNote && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="favorite-icon text-text-secondary">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
          )}
          {/* Pin icon */}
          {isPinnedNote && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pin-icon text-text-secondary">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          )}

          {/* More options button - only visible on hover */}
          <button
            className="more-button w-4 h-4 flex items-center justify-center bg-transparent border-none text-text-tertiary rounded-full hover:bg-background-notes/20 hover:text-text opacity-0 group-hover:opacity-100 transition-all duration-150"
            onClick={toggleMenu}
            title="More options"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {/* Regular Dropdown Menu (non-context menu) */}
          {showMenu && !isContextMenu && (
            <div
              className="dropdown-menu absolute bg-popover rounded-md shadow-[0_5px_15px_rgba(0,0,0,0.3)] z-[100] min-w-[140px] overflow-hidden border border-border text-xs font-twitter"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              style={{
                top: '30px',
                right: '0px',
              }}
            >
              <button
                className="flex items-center gap-1.5 w-full px-2.5 py-1.5 bg-transparent border-none text-text-secondary text-left cursor-pointer transition-colors hover:bg-background-notes/20"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateMenuState({ showMenu: false, isContextMenu: false });
                  // Small delay to ensure menu is closed before action
                  setTimeout(() => {
                    onClick(note); // Open the note for editing
                  }, 10);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit</span>
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-text-secondary text-left cursor-pointer transition-colors hover:bg-background-notes/30"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateMenuState({ showMenu: false, isContextMenu: false });
                  // Small delay to ensure menu is closed before action
                  setTimeout(() => {
                    console.log('Duplicate note:', note.id);
                  }, 10);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Duplicate</span>
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-text-secondary text-left cursor-pointer transition-colors hover:bg-background-notes/30"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateMenuState({ showMenu: false, isContextMenu: false });
                  // Small delay to ensure menu is closed before action
                  setTimeout(() => {
                    updateMenuState({ showCollectionManager: true });
                  }, 10);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Organize</span>
              </button>
              <button
                className={`flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none ${isFavoriteNote ? 'text-text' : 'text-text-secondary'} text-left cursor-pointer transition-colors hover:bg-background-notes/30`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateMenuState({ showMenu: false, isContextMenu: false });
                  // Small delay to ensure menu is closed before action
                  setTimeout(() => {
                    // Toggle favorite state
                    // Create a deep copy of the note to ensure we don't lose any properties
                    const updatedNote = {
                      ...note,
                      favorite: !isFavoriteNote,
                      // Ensure content is preserved exactly as it was
                      content: note.content
                    };
                    // Update the note in the database
                    updateNote(updatedNote).then(() => {
                      // Notify other windows that this note has been updated with the specific property
                      // This allows the main window to update its state without a full reload
                      window.noteWindow.noteUpdated(note.id, { favorite: !isFavoriteNote });
                      
                      // PERMANENT FIX: Use the onCollectionUpdate callback to trigger parent refresh
                      // This directly tells the parent component to refresh its state
                      if (onCollectionUpdate) {
                        console.log('NoteCard - Calling onCollectionUpdate to refresh parent state');
                        onCollectionUpdate();
                      }
                    });
                  }, 10);
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={isFavoriteNote ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                <span>{isFavoriteNote ? 'Unfavorite' : 'Favorite'}</span>
              </button>

              <button
                className={`flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none ${isPinnedNote ? 'text-text' : 'text-text-secondary'} text-left cursor-pointer transition-colors hover:bg-background-notes/30`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateMenuState({ showMenu: false, isContextMenu: false });
                  // Small delay to ensure menu is closed before action
                  setTimeout(() => {
                    // Toggle pin state
                    // Create a deep copy of the note to ensure we don't lose any properties
                    const updatedNote = {
                      ...note,
                      pinned: !isPinnedNote,
                      // Ensure content is preserved exactly as it was
                      content: note.content
                    };
                    // Update the note in the database
                    updateNote(updatedNote).then(() => {
                      // Notify other windows that this note has been updated with the specific property
                      // This allows the main window to update its state without a full reload
                      window.noteWindow.noteUpdated(note.id, { pinned: !isPinnedNote });
                      
                      // PERMANENT FIX: Use the onCollectionUpdate callback to trigger parent refresh
                      // This directly tells the parent component to refresh its state
                      if (onCollectionUpdate) {
                        console.log('NoteCard - Calling onCollectionUpdate to refresh parent state');
                        onCollectionUpdate();
                      }
                    });
                  }, 10);
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={isPinnedNote ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>{isPinnedNote ? 'Remove Float' : 'Float on Top'}</span>
              </button>

              {/* Color option */}
              <button
                className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-text-secondary text-left cursor-pointer transition-colors hover:bg-background-notes/30"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateMenuState({ showMenu: false, isContextMenu: false });
                  // Small delay to ensure menu is closed before action
                  setTimeout(() => {
                    // Ensure we're back in the note card context
                    if (noteCardRef.current) {
                      updateMenuState({ showColorPicker: true });
                    }
                  }, 10);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="4"></circle>
                </svg>
                <span>Change Color</span>
              </button>
              <button
                className="delete-action flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none text-danger text-left cursor-pointer transition-colors hover:bg-background-notes/30"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateMenuState({ showMenu: false, isContextMenu: false });
                  // Small delay to ensure menu is closed before action
                  setTimeout(() => {
                    handleDeleteClick(e);
                  }, 10);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Note Content */}
      <div className="note-content flex-1 px-4 py-3 text-xs overflow-hidden whitespace-pre-line font-twitter">
        {getContentPreview(note.content) || <span className="empty-content italic opacity-60">No content</span>}
      </div>

      {/* Note Footer */}
      <div
        className="note-footer px-3 py-2 flex items-center justify-end text-xs text-text-tertiary font-twitter"
        style={{ backgroundColor: colorStyle.footerBg || '' }}
      >
        <span className="note-date">{formatDate(note.createdAt)}</span>
      </div>

      {/* Confirmation dialog */}
      {showConfirmDelete && (
        <div
          className="absolute inset-0 bg-background-titlebar/95 flex items-center justify-center z-10 rounded-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center p-4 font-twitter">
            <p className="m-0 mb-4 text-text">Are you sure you want to delete this note?</p>
            <div className="flex justify-center gap-3">
              <button
                className="primary-button px-4 py-2 rounded bg-danger text-white border-none text-sm cursor-pointer transition-all duration-200 hover:bg-danger/90"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
              <button
                className="px-4 py-2 rounded bg-transparent text-text border border-border/20 text-sm cursor-pointer transition-all duration-200 hover:bg-background-notes/30"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color picker using shared component */}
      <ColorPicker
        isOpen={showColorPicker}
        onClose={() => updateMenuState({ showColorPicker: false })}
        currentColor={note.color}
        onColorSelect={async (color) => {
          // Update note color
          const updatedNote = {
            ...note,
            color: color,
            // Ensure content is preserved exactly as it was
            content: note.content
          };
          
          try {
            // Update the note in the database
            await updateNote(updatedNote);
            
            // Notify other windows that this note has been updated with the specific property
            // This allows the main window to update its state without a full reload
            window.noteWindow.noteUpdated(note.id, { color: color });
            
            // PERMANENT FIX: Use the onCollectionUpdate callback to trigger parent refresh
            // This directly tells the parent component to refresh its state
            if (onCollectionUpdate) {
              console.log('NoteCard - Calling onCollectionUpdate to refresh parent state after color change');
              onCollectionUpdate();
            }
          } catch (error) {
            console.error('Error updating note color:', error);
          }
        }}
      />

      {/* Collection Manager Modal */}
      <NoteCollectionManager
        note={note}
        isOpen={showCollectionManager}
        onClose={() => updateMenuState({ showCollectionManager: false })}
        allNotes={allNotes}
        onUpdate={() => {
          // Notify parent component that collections have been updated
          // This will trigger a refresh of the note list and collection counts
          if (onCollectionUpdate) {
            onCollectionUpdate();
          }
          // Also notify other windows for consistency
          if (window.noteWindow && window.noteWindow.noteUpdated) {
            window.noteWindow.noteUpdated(note.id, { collectionsUpdated: true });
          }
        }}
      />
    </div>
    </>
  );
};

export default memo(NoteCard, areNoteCardPropsEqual);
