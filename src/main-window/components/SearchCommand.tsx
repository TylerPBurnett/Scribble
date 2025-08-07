import React, { useState, useEffect, useCallback } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { FileText, Clock, Star, Hash, Plus, Settings, Search, Globe } from 'lucide-react';
import { Note } from '@/shared/types/Note';

interface SearchCommandProps {
  notes: Note[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNoteClick: (note: Note) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  collections?: Array<{ id: string; name: string; noteIds: string[] }>;
  activeCollectionId?: string;
  compact?: boolean; // Add compact mode for toolbar usage
}

export const SearchCommand: React.FC<SearchCommandProps> = ({
  notes,
  searchQuery,
  onSearchChange,
  onNoteClick,
  onNewNote,
  onOpenSettings,
  isOpen = false,
  onOpenChange,
  collections = [],
  activeCollectionId = 'all',
  compact = false,
}) => {
  const [open, setOpen] = useState(isOpen);
  const [value, setValue] = useState('');
  const [searchAllNotes, setSearchAllNotes] = useState(false);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    setValue(searchQuery);
  }, [searchQuery]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      // Clear search when closing
      setValue('');
      onSearchChange('');
    }
  }, [onOpenChange, onSearchChange]);

  const handleValueChange = useCallback((newValue: string) => {
    setValue(newValue);
    onSearchChange(newValue);
  }, [onSearchChange]);

  // Filter notes based on search query and search scope
  const filteredNotes = notes.filter(note => {
    // First filter by active collection if not searching all notes and not in 'all' collection
    if (!searchAllNotes && activeCollectionId && activeCollectionId !== 'all') {
      const activeCollection = collections.find(c => c.id === activeCollectionId);
      if (activeCollection && !activeCollection.noteIds.includes(note.id)) {
        return false;
      }
    }
    
    // Then filter by search query
    if (!value) return true;
    const lowerQuery = value.toLowerCase();
    return (
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery)
    );
  });

  // Get recent notes (last 5 modified)
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Get favorite notes
  const favoriteNotes = notes.filter(note => note.favorite);

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleNoteSelect = (note: Note) => {
    handleOpenChange(false);
    onNoteClick(note);
  };

  const handleNewNoteAction = () => {
    handleOpenChange(false);
    onNewNote();
  };

  const handleSettingsAction = () => {
    handleOpenChange(false);
    onOpenSettings();
  };

  const handleToggleSearchScope = () => {
    setSearchAllNotes(!searchAllNotes);
  };

  // Get the current collection name for display
  const activeCollectionName = collections.find(c => c.id === activeCollectionId)?.name || 'All Notes';
  const searchScopeText = searchAllNotes ? 'All Notes' : activeCollectionName;

  return (
    <>
      {/* Search Bar (visible when command dialog is closed) */}
      {!open && (
        <div 
          className="search-container w-full cursor-pointer"
          onClick={() => handleOpenChange(true)}
        >
          <div 
            className={`search-input flex items-center justify-center gap-1.5 w-full border border-transparent rounded-lg text-text-secondary focus:outline-none hover:border-search-hover-outline hover:shadow-sm transition-all duration-200 shadow-sm ${
              compact 
                ? 'py-1 px-6 text-xs' 
                : 'py-1.5 px-8 text-sm rounded-xl'
            }`}
            style={{ 
              backgroundColor: 'hsl(var(--background-search))',
              '--hover-bg': 'hsl(var(--background-search) / 0.8)'
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--background-search) / 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--background-search))';
            }}
          >
            <svg 
              width={compact ? "14" : "16"} 
              height={compact ? "14" : "16"} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="flex-shrink-0 opacity-60"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span className="opacity-70 truncate">{searchQuery || 'Scribble'}</span>
          </div>
        </div>
      )}

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput
          placeholder="Search notes or type a command..."
          value={value}
          onValueChange={handleValueChange}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Quick Actions */}
          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleNewNoteAction}>
              <Plus className="mr-2 h-4 w-4" />
              <span>New Note</span>
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={handleSettingsAction}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
            {/* Search Scope Toggle - only show if not in 'All Notes' collection */}
            {activeCollectionId !== 'all' && (
              <CommandItem onSelect={handleToggleSearchScope}>
                {searchAllNotes ? <Search className="mr-2 h-4 w-4" /> : <Globe className="mr-2 h-4 w-4" />}
                <span>Search in: {searchScopeText}</span>
                <CommandShortcut>⌘⇧F</CommandShortcut>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />

          {/* Search Results */}
          {value && filteredNotes.length > 0 && (
            <>
              <CommandGroup heading={`Search Results in ${searchScopeText} (${filteredNotes.length})`}>
                {filteredNotes.slice(0, 10).map((note) => (
                  <CommandItem
                    key={note.id}
                    value={note.title}
                    onSelect={() => handleNoteSelect(note)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <div className="flex-1 flex items-center justify-between">
                      <span>{note.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Recent Notes (when not searching) */}
          {!value && recentNotes.length > 0 && (
            <>
              <CommandGroup heading="Recent">
                {recentNotes.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={note.title}
                    onSelect={() => handleNoteSelect(note)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    <div className="flex-1 flex items-center justify-between">
                      <span>{note.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Favorite Notes (when not searching) */}
          {!value && favoriteNotes.length > 0 && (
            <>
              <CommandGroup heading="Favorites">
                {favoriteNotes.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={note.title}
                    onSelect={() => handleNoteSelect(note)}
                  >
                    <Star className="mr-2 h-4 w-4 fill-current" />
                    <div className="flex-1 flex items-center justify-between">
                      <span>{note.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Collections (when not searching) */}
          {!value && collections.length > 1 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Collections">
                {collections
                  .filter(c => c.id !== 'all' && c.noteIds.length > 0)
                  .map((collection) => (
                    <CommandItem
                      key={collection.id}
                      value={collection.name}
                      disabled
                    >
                      <Hash className="mr-2 h-4 w-4" />
                      <div className="flex-1 flex items-center justify-between">
                        <span>{collection.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {collection.noteIds.length} notes
                        </span>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
