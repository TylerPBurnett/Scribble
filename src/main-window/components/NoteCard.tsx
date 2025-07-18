import { useState, useEffect, useRef } from 'react';
import { Note } from '../../shared/types/Note';
import { deleteNote, updateNote } from '../../shared/services/noteService';
import NoteCollectionManager from './NoteCollectionManager';

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

const NoteCard = ({ note, onClick, isActive = false, onDelete, isPinned = false, isFavorite = false, onCollectionUpdate, allNotes = [] }: NoteCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isContextMenu, setIsContextMenu] = useState(false);
  // Refs for DOM elements
  const noteCardRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

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

  // Effect to handle context menu
  useEffect(() => {
    // Function to close the menu when clicking anywhere
    const handleGlobalClick = () => {
      if (showMenu) {
        setShowMenu(false);
        setIsContextMenu(false);
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

  // Assign a color based on the note ID (for consistent colors)
  const getNoteColor = () => {
    const colors = [
      { border: 'border-l-note-slate', className: 'slate' },
      { border: 'border-l-note-sky', className: 'sky' },
      { border: 'border-l-note-emerald', className: 'emerald' },
      { border: 'border-l-note-amber', className: 'amber' },
      { border: 'border-l-note-rose', className: 'rose' },
      { border: 'border-l-note-violet', className: 'violet' }
    ];

    // Default to first color if note ID is missing
    if (!note || !note.id) {
      return colors[0];
    }

    // Use the last character of the ID to determine the color
    const lastChar = note.id.charAt(note.id.length - 1);
    const colorIndex = parseInt(lastChar, 16) % colors.length || 0; // Default to 0 if NaN
    return colors[colorIndex];
  };

  // Check if the note is favorited or pinned
  const isFavoriteNote = isFavorite || note.favorite;
  const isPinnedNote = isPinned || note.pinned;

  // Toggle dropdown menu
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the note click
    setShowMenu(!showMenu);
    setIsContextMenu(false);
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    // Prevent default browser context menu and note click
    e.preventDefault();
    e.stopPropagation();

    // Close any existing menu first
    setShowMenu(false);
    setIsContextMenu(false);
    setShowColorPicker(false);

    // Calculate position, ensuring menu stays within viewport
    const x = Math.min(e.clientX, window.innerWidth - 160);
    const y = Math.min(e.clientY, window.innerHeight - 200);

    // Use setTimeout to ensure state updates happen after current event cycle
    setTimeout(() => {
      setMenuPosition({ x, y });
      setIsContextMenu(true);
      setShowMenu(true);
    }, 0);

    // Stop event propagation
    return false;
  };

  // Handle delete button click
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the note click
    setShowMenu(false);
    setShowConfirmDelete(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the note click
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
  };

  // Handle cancel delete
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the note click
    setShowConfirmDelete(false);
  };

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

  // Get note color styling
  const getNoteColorStyle = () => {
    // If note has a custom color, use it
    if (note.color) {
      // For dark background, use light text
      if (note.color === '#333333') {
        return {
          backgroundColor: note.color,
          color: '#ffffff',
          headerBg: '#333333',
          footerBg: '#333333'
        };
      }
      // For white background, use dark text
      else if (note.color === '#ffffff') {
        return {
          backgroundColor: note.color,
          color: '#333333',
          headerBg: '#f8f8f8',
          footerBg: '#f8f8f8'
        };
      }
      // For all other colors (including pastel colors), use the same color for header and footer
      else {
        return {
          backgroundColor: note.color,
          color: note.color === '#d3d3d3' || note.color.startsWith('#') ? '#333333' : '', // Use black text for all custom colors
          headerBg: note.color,
          footerBg: note.color
        };
      }
    }

    // Default styling using CSS variables
    return {
      backgroundColor: 'hsl(var(--card))',
      color: 'hsl(var(--card-foreground))',
      headerBg: '',
      footerBg: ''
    };
  };

  const colorStyle = getNoteColorStyle();
  const colorInfo = getNoteColor();

  return (
    <>
      {/* Context Menu Overlay - rendered at the root level */}
      {showMenu && isContextMenu && (
        <div
          className="fixed inset-0 z-[9998] bg-transparent"
          onClick={() => {
            setShowMenu(false);
            setIsContextMenu(false);
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
                setShowMenu(false);
                setIsContextMenu(false);
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
                setShowMenu(false);
                setIsContextMenu(false);
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
                setShowMenu(false);
                setIsContextMenu(false);
                // Small delay to ensure menu is closed before action
                setTimeout(() => {
                  setShowCollectionManager(true);
                }, 10);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Organize</span>
            </button>
            <button
              className={`flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none ${isFavoriteNote ? 'text-amber-500' : 'text-text-secondary'} text-left cursor-pointer transition-colors hover:bg-background-notes/30`}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowMenu(false);
                setIsContextMenu(false);
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
              className={`flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none ${isPinnedNote ? 'text-amber-500' : 'text-text-secondary'} text-left cursor-pointer transition-colors hover:bg-background-notes/30`}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowMenu(false);
                setIsContextMenu(false);
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
                setShowMenu(false);
                setIsContextMenu(false);
                // Small delay to ensure menu is closed before action
                setTimeout(() => {
                  setShowColorPicker(true);
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
                setShowMenu(false);
                setIsContextMenu(false);
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
        className={`note-card ${colorInfo.className} ${isActive ? 'selected' : ''} rounded-xl overflow-hidden flex flex-col ${colorInfo.border} border-l-3 shadow-sm transition-all duration-200 cursor-pointer h-note-card
          hover:translate-y-[-2px] hover:shadow-md group`}
        onClick={() => onClick(note)}
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="favorite-icon text-amber-500">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
          )}
          {/* Pin icon */}
          {isPinnedNote && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pin-icon text-primary">
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
                  setShowMenu(false);
                  setIsContextMenu(false);
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
                  setShowMenu(false);
                  setIsContextMenu(false);
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
                  setShowMenu(false);
                  setIsContextMenu(false);
                  // Small delay to ensure menu is closed before action
                  setTimeout(() => {
                    setShowCollectionManager(true);
                  }, 10);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Organize</span>
              </button>
              <button
                className={`flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none ${isFavoriteNote ? 'text-amber-500' : 'text-text-secondary'} text-left cursor-pointer transition-colors hover:bg-background-notes/30`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  setIsContextMenu(false);
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
                className={`flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none ${isPinnedNote ? 'text-amber-500' : 'text-text-secondary'} text-left cursor-pointer transition-colors hover:bg-background-notes/30`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowMenu(false);
                  setIsContextMenu(false);
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
                  setShowMenu(false);
                  setIsContextMenu(false);
                  // Small delay to ensure menu is closed before action
                  setTimeout(() => {
                    // Ensure we're back in the note card context
                    if (noteCardRef.current) {
                      setShowColorPicker(true);
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
                  setShowMenu(false);
                  setIsContextMenu(false);
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

      {/* Modern color picker overlay - positioned within the note card */}
      {showColorPicker && noteCardRef.current && (
        <div
          ref={colorPickerRef}
          className="absolute inset-0 z-20 flex items-center justify-center rounded-xl overflow-hidden font-twitter color-picker-enter"
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(false);
          }}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div
            className="relative bg-gradient-to-b from-popover to-popover/90 rounded-xl shadow-xl overflow-hidden w-[80%] max-w-[180px] border border-white/10 color-picker-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
            }}
          >
            {/* Modern header with title */}
            <div className="flex justify-between items-center px-3 py-2">
              <h3 className="text-xs font-medium text-text m-0 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="4"></circle>
                </svg>
                <span>Note Color</span>
              </h3>
              <button
                className="text-text-tertiary hover:text-text bg-transparent border-none cursor-pointer p-1 rounded-full hover:bg-white/5 transition-colors"
                onClick={() => setShowColorPicker(false)}
                aria-label="Close color picker"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18"></path>
                  <path d="M6 6L18 18"></path>
                </svg>
              </button>
            </div>

            {/* Color options grid with modern styling */}
            <div className="px-3 pb-3">
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    className={`w-9 h-9 rounded-full transition-all duration-200
                      ${note.color === color.value
                        ? 'ring-1 ring-primary ring-offset-1 ring-offset-background-notes scale-105 shadow-lg'
                        : 'hover:scale-110 hover:shadow-md border border-white/10'
                      } focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-notes`}
                    style={{
                      backgroundColor: color.value,
                      transform: note.color === color.value ? 'translateY(-1px)' : 'none'
                    }}
                    title={color.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Update note color
                      const updatedNote = {
                        ...note,
                        color: color.value,
                        // Ensure content is preserved exactly as it was
                        content: note.content
                      };
                      // Update the note in the database
                      updateNote(updatedNote).then(() => {
                        // Notify other windows that this note has been updated with the specific property
                        // This allows the main window to update its state without a full reload
                        window.noteWindow.noteUpdated(note.id, { color: color.value });
                        // Close the color picker
                        setShowColorPicker(false);
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collection Manager Modal */}
      <NoteCollectionManager
        note={note}
        isOpen={showCollectionManager}
        onClose={() => setShowCollectionManager(false)}
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

export default NoteCard;
