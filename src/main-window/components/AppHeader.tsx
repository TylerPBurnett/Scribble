import React from 'react';
import { useTheme } from '../../shared/services/themeService';

interface AppHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onNewNote,
  onOpenSettings,
  searchInputRef,
}) => {
  const { theme } = useTheme();

  // Define theme-specific styles for the plus button
  const getButtonStyles = () => {
    switch (theme) {
      case 'light':
        return 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm';
      case 'dark':
        return 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg';
      case 'dim':
      default:
        return 'bg-amber-500 text-black hover:bg-amber-400 shadow-md';
    }
  };

  return (
    <div className="app-header flex items-center justify-between px-6 py-3 bg-background-titlebar border-b-0 transition-all duration-300">
      {/* Search container */}
      <div className="search-container relative w-full max-w-md">
        <div className="search-icon absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          className="search-input w-full py-2 pl-10 pr-4 bg-background-notes/30 border-0 rounded-md text-sm text-text placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="header-actions flex items-center gap-3">
        <button
          className="settings-button flex items-center justify-center w-10 h-10 text-text-secondary rounded-md hover:bg-background-tertiary transition-colors"
          onClick={onOpenSettings}
          title="Settings (Ctrl+,)"
          tabIndex={-1}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button
          className={`new-note-button flex items-center justify-center w-10 h-10 rounded-md transition-all duration-200 ${getButtonStyles()}`}
          onClick={onNewNote}
          title="New Note (Ctrl+N)"
          tabIndex={-1}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};