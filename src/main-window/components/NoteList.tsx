import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Note } from '../../shared/types/Note';
import { deleteNote } from '../../shared/services/noteService';
import { getNotesSortOption, saveNotesSortOption, SortOption } from '../../shared/services/settingsService';
import NoteCard from './NoteCard';

interface NoteListProps {
  notes: Note[];
  onNoteClick: (note: Note) => void;
  activeNoteId?: string;
  onNoteDelete?: (noteId: string) => void;
  onCollectionUpdate?: () => void;
  activeCollectionId?: string;
  activeCollectionName?: string;
  allNotes?: Note[]; // Add allNotes prop for collection count updates
}

const NoteList = ({ notes, onNoteClick, activeNoteId, onNoteDelete, onCollectionUpdate, activeCollectionId, activeCollectionName, allNotes = [] }: NoteListProps) => {
  const [deletedNotes, setDeletedNotes] = useState<string[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>(getNotesSortOption());
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortMenu]);

  // Sort notes based on current sort option
  const sortNotes = (notesToSort: Note[]): Note[] => {
    return [...notesToSort].sort((a, b) => {
      if (sortOption.field === 'title') {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return sortOption.direction === 'asc'
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA);
      } else {
        const dateA = a[sortOption.field].getTime();
        const dateB = b[sortOption.field].getTime();
        return sortOption.direction === 'asc'
          ? dateA - dateB
          : dateB - dateA;
      }
    });
  };

  // Toggle sort menu
  const toggleSortMenu = () => {
    setShowSortMenu(!showSortMenu);
  };

  // Handle sort option selection with useCallback
  const handleSortOptionSelect = useCallback((option: SortOption) => {
    setSortOption(option);
    saveNotesSortOption(option);
    setShowSortMenu(false);
  }, []);

  // Handle note deletion with useCallback
  const handleNoteDelete = useCallback(async (noteId: string) => {
    console.log('NoteList - Deleting note:', noteId);
    // Delete the note using the service
    try {
      await deleteNote(noteId);
      console.log('NoteList - Note deleted from service');

      // Add to deleted notes list to remove from UI
      setDeletedNotes(prev => [...prev, noteId]);

      // Call the parent's onNoteDelete if provided
      if (onNoteDelete) {
        onNoteDelete(noteId);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }, [onNoteDelete]);

  // Filter out deleted notes with memoization
  const filteredNotes = useMemo(() => {
    return notes.filter(note => !deletedNotes.includes(note.id));
  }, [notes, deletedNotes]);

  // Apply sorting to notes with memoization
  const sortedFilteredNotes = useMemo(() => {
    return sortNotes(filteredNotes);
  }, [filteredNotes, sortOption]);

  // Separate favorite notes from other notes with memoization
  const { favoriteNotes, otherNotes } = useMemo(() => {
    // Only include notes that are explicitly marked as favorites
    const favorites = sortedFilteredNotes.filter(note => note.favorite);
    // All other notes (including pinned ones) go in the regular notes section
    const others = sortedFilteredNotes.filter(note => !note.favorite);
    return { favoriteNotes: favorites, otherNotes: others };
  }, [sortedFilteredNotes]);

  return (
    <div className="notes-container notes-container-transparent flex-1 px-4 py-4 overflow-y-auto transition-all duration-300">
      {/* Favorites Section */}
      {favoriteNotes.length > 0 && (
        <div className="notes-section mb-4">
          <div className="section-title flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-text-tertiary tracking-wider">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              <span>Favorites</span>
            </div>
          </div>
          <div className="notes-grid grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
            {favoriteNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={onNoteClick}
                isActive={note.id === activeNoteId}
                onDelete={handleNoteDelete}
                isFavorite={true}
                onCollectionUpdate={onCollectionUpdate}
                allNotes={allNotes}
              />
            ))}
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="notes-section transparency-layer-content mb-4">
        <div className="section-title flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-medium text-text-tertiary tracking-wider">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Notes</span>
            <span className="text-[10px] bg-background-tertiary px-1.5 py-0.5 rounded-full">
              {otherNotes.length}
            </span>
          </div>

          {/* Sort Button */}
          <div className="relative">
            <button
              className="sort-button flex items-center justify-center w-6 h-6 text-text-tertiary rounded-full hover:bg-background-tertiary/30 transition-colors"
              onClick={toggleSortMenu}
              title="Sort notes"
              tabIndex={-1}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5h10"></path>
                <path d="M11 9h7"></path>
                <path d="M11 13h4"></path>
                <path d="M3 17h18"></path>
                <path d="M3 5l4 8"></path>
                <path d="M7 5l-4 8"></path>
              </svg>
            </button>

            {/* Sort Menu */}
            {showSortMenu && (
              <div
                ref={sortMenuRef}
                className="absolute right-0 top-8 bg-[#21222c] rounded-md shadow-[0_5px_15px_rgba(0,0,0,0.3)] z-[100] min-w-[180px] overflow-hidden border border-white/5 text-xs font-twitter"
              >
                <div className="py-1.5 px-3 text-text-tertiary border-b border-white/5">Sort by</div>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-1.5 bg-transparent border-none text-left cursor-pointer transition-colors hover:bg-background-notes/20 ${sortOption.field === 'title' && sortOption.direction === 'asc' ? 'text-primary' : 'text-text-secondary'}`}
                  onClick={() => handleSortOptionSelect({ label: 'Title (A-Z)', field: 'title', direction: 'asc' })}
                >
                  <span>Title (A-Z)</span>
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-1.5 bg-transparent border-none text-left cursor-pointer transition-colors hover:bg-background-notes/20 ${sortOption.field === 'title' && sortOption.direction === 'desc' ? 'text-primary' : 'text-text-secondary'}`}
                  onClick={() => handleSortOptionSelect({ label: 'Title (Z-A)', field: 'title', direction: 'desc' })}
                >
                  <span>Title (Z-A)</span>
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-1.5 bg-transparent border-none text-left cursor-pointer transition-colors hover:bg-background-notes/20 ${sortOption.field === 'createdAt' && sortOption.direction === 'desc' ? 'text-primary' : 'text-text-secondary'}`}
                  onClick={() => handleSortOptionSelect({ label: 'Date Created (Newest)', field: 'createdAt', direction: 'desc' })}
                >
                  <span>Date Created (Newest)</span>
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-1.5 bg-transparent border-none text-left cursor-pointer transition-colors hover:bg-background-notes/20 ${sortOption.field === 'createdAt' && sortOption.direction === 'asc' ? 'text-primary' : 'text-text-secondary'}`}
                  onClick={() => handleSortOptionSelect({ label: 'Date Created (Oldest)', field: 'createdAt', direction: 'asc' })}
                >
                  <span>Date Created (Oldest)</span>
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-1.5 bg-transparent border-none text-left cursor-pointer transition-colors hover:bg-background-notes/20 ${sortOption.field === 'updatedAt' && sortOption.direction === 'desc' ? 'text-primary' : 'text-text-secondary'}`}
                  onClick={() => handleSortOptionSelect({ label: 'Date Modified (Newest)', field: 'updatedAt', direction: 'desc' })}
                >
                  <span>Date Modified (Newest)</span>
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-3 py-1.5 bg-transparent border-none text-left cursor-pointer transition-colors hover:bg-background-notes/20 ${sortOption.field === 'updatedAt' && sortOption.direction === 'asc' ? 'text-primary' : 'text-text-secondary'}`}
                  onClick={() => handleSortOptionSelect({ label: 'Date Modified (Oldest)', field: 'updatedAt', direction: 'asc' })}
                >
                  <span>Date Modified (Oldest)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="empty-state transparency-layer-content flex flex-col items-center justify-center py-12 text-center">
            <div className="empty-icon text-text-tertiary opacity-50 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {activeCollectionId === 'all' || !activeCollectionName 
                ? 'No notes yet' 
                : `No notes in ${activeCollectionName}`}
            </h2>
            <p className="text-text-tertiary mb-6">
              {activeCollectionId === 'all' || !activeCollectionName
                ? 'Create your first note to get started'
                : `Create a note or add existing notes to ${activeCollectionName}`}
            </p>
            <button
              className="primary-button flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-md font-medium hover:bg-primary-dark transition-colors"
              onClick={() => {
                // This is just a placeholder - the actual new note functionality is handled in the parent component
                console.log('Create new note clicked in empty state');
              }}
              tabIndex={-1}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Note
            </button>
          </div>
        ) : (
          <div className="notes-grid grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
            {otherNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={onNoteClick}
                isActive={note.id === activeNoteId}
                onDelete={handleNoteDelete}
                onCollectionUpdate={onCollectionUpdate}
                allNotes={allNotes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteList;
