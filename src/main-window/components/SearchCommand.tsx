import React, { useState, useEffect, useCallback } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { FileText, Clock, Star, Hash, Plus, Settings } from 'lucide-react';
import { Note } from '@/shared/types/Note';
import { formatHotkeyForDisplay } from '@/shared/services/hotkeyService';

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
}) => {
  const [open, setOpen] = useState(isOpen);
  const [value, setValue] = useState('');

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

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => {
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
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  return (
    <>
      {/* Search Bar (visible when command dialog is closed) */}
      {!open && (
        <div 
          className="search-container relative w-full max-w-md cursor-pointer"
          onClick={() => handleOpenChange(true)}
        >
          <div className="search-icon absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div className="search-input w-full py-1.5 pl-10 pr-4 bg-background-notes/50 border border-background-notes/20 rounded-lg text-sm text-text-secondary focus:outline-none hover:bg-background-notes/60 transition-all duration-200">
            <span>{searchQuery || 'Search notes...'}</span>
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
          </CommandGroup>

          <CommandSeparator />

          {/* Search Results */}
          {value && filteredNotes.length > 0 && (
            <>
              <CommandGroup heading={`Search Results (${filteredNotes.length})`}>
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
