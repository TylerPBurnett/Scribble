import React, { useEffect, useState, useRef } from 'react';
import { SearchCommand } from './SearchCommand';
import { Note } from '@/shared/types/Note';

interface CompactToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
  notes?: Note[];
  onNoteClick?: (note: Note) => void;
  isSearchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  collections?: Array<{ id: string; name: string; noteIds: string[] }>;
  activeCollectionId?: string;
}

export const CompactToolbar: React.FC<CompactToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onNewNote,
  onOpenSettings,
  notes = [],
  onNoteClick,
  isSearchOpen,
  onSearchOpenChange,
  collections,
  activeCollectionId,
}) => {
  const [searchBarWidth, setSearchBarWidth] = useState(400);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const leftSpacerRef = useRef<HTMLDivElement>(null);
  const rightActionsRef = useRef<HTMLDivElement>(null);

  // Calculate responsive search bar width
  const calculateSearchBarWidth = () => {
    if (!toolbarRef.current || !leftSpacerRef.current || !rightActionsRef.current) return;

    const toolbarWidth = toolbarRef.current.offsetWidth;
    const leftSpacerWidth = leftSpacerRef.current.offsetWidth;
    const rightActionsWidth = rightActionsRef.current.offsetWidth;
    
    // Account for padding and gaps (px-4 = 32px total)
    const padding = 32;
    const minGap = 16; // Minimum gap between elements
    
    // Calculate available space for search bar
    const availableWidth = toolbarWidth - leftSpacerWidth - rightActionsWidth - padding - (minGap * 2);
    
    // Set minimum and maximum constraints
    const minWidth = 100; // Reduced minimum to ensure buttons stay visible
    const maxWidth = 400;
    
    // Calculate responsive width with proper constraints
    const targetWidth = Math.max(minWidth, Math.min(maxWidth, availableWidth));
    
    setSearchBarWidth(targetWidth);
  };

  // Update search bar width on window resize and component mount
  useEffect(() => {
    calculateSearchBarWidth();
    
    const handleResize = () => {
      calculateSearchBarWidth();
    };

    // Use ResizeObserver for more accurate detection of size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (toolbarRef.current) {
      resizeObserver.observe(toolbarRef.current);
    }

    // Fallback to window resize event
    window.addEventListener('resize', handleResize);
    
    // Initial calculation after a short delay to ensure all elements are rendered
    const timeoutId = setTimeout(calculateSearchBarWidth, 100);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div 
      ref={toolbarRef}
      className="compact-toolbar flex items-center w-full h-full px-4"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left spacer - minimum width to prevent overlap with macOS traffic lights - draggable */}
      <div 
        ref={leftSpacerRef}
        className="flex-shrink-0 w-20"
      />
      
      {/* Flexible draggable space before search */}
      <div className="flex-1 min-w-0" />
      
      {/* Responsive Search Command - dynamically sized and centered - not draggable */}
      <div 
        className="flex-shrink-0 flex items-center justify-center"
        style={{ 
          WebkitAppRegion: 'no-drag',
          width: `${searchBarWidth}px`,
          transition: 'width 0.2s ease-out'
        } as React.CSSProperties}
      >
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
          compact={true}
        />
      </div>

      {/* Flexible draggable space after search */}
      <div className="flex-1 min-w-0" />

      {/* Right action buttons with fixed width - not draggable */}
      <div 
        ref={rightActionsRef}
        className="flex-shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="toolbar-actions flex items-center gap-1">
          <button
            className="settings-button flex items-center justify-center w-7 h-7 text-text-secondary rounded-md hover:bg-background-tertiary hover:text-text transition-all duration-200 ease-out"
            onClick={onOpenSettings}
            title="Settings (Ctrl+,)"
            tabIndex={-1}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <button
            className="new-note-button flex items-center justify-center w-7 h-7 text-text-secondary rounded-md hover:bg-background-tertiary hover:text-text transition-all duration-200 ease-out"
            onClick={onNewNote}
            title="New Note (Ctrl+N)"
            tabIndex={-1}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
