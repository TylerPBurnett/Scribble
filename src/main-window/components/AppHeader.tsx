import React from 'react';
import { SearchCommand } from './SearchCommand';
import { Note } from '@/shared/types/Note';

interface AppHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  notes?: Note[];
  onNoteClick?: (note: Note) => void;
  isSearchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  collections?: Array<{ id: string; name: string; noteIds: string[] }>;
  activeCollectionId?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onNewNote,
  onOpenSettings,
  searchInputRef,
  notes = [],
  onNoteClick,
  isSearchOpen,
  onSearchOpenChange,
  collections,
  activeCollectionId,
}) => {

  return (
    <div className="app-header flex items-center justify-between px-6 py-2 bg-background-titlebar border-b-0 transition-all duration-300">
      {/* Search Command */}
      <SearchCommand
        notes={notes}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onNoteClick={onNoteClick || (() => {})}
        onNewNote={onNewNote}
        onOpenSettings={onOpenSettings}
        isOpen={isSearchOpen}
        onOpenChange={onSearchOpenChange}
        collections={collections}
        activeCollectionId={activeCollectionId}
      />

      <div className="header-actions flex items-center gap-3">
        <button
          className="settings-button flex items-center justify-center w-9 h-9 text-text-secondary rounded-lg hover:bg-background-tertiary hover:text-text hover:scale-105 transition-all duration-200 ease-out"
          onClick={onOpenSettings}
          title="Settings (Ctrl+,)"
          tabIndex={-1}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button
          className="new-note-button flex items-center justify-center w-9 h-9 text-text-secondary rounded-lg hover:bg-background-tertiary hover:text-text hover:scale-105 transition-all duration-200 ease-out"
          onClick={onNewNote}
          title="New Note (Ctrl+N)"
          tabIndex={-1}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};