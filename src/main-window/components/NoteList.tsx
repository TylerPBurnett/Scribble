import { useState } from 'react';
import { Note } from '../../shared/types/Note';
import { deleteNote } from '../../shared/services/noteService';
import NoteCard from './NoteCard';
import './NoteList.css';

interface NoteListProps {
  notes: Note[];
  onNoteClick: (note: Note) => void;
  activeNoteId?: string;
  onNoteDelete?: (noteId: string) => void;
}

const NoteList = ({ notes, onNoteClick, activeNoteId, onNoteDelete }: NoteListProps) => {
  const [deletedNotes, setDeletedNotes] = useState<string[]>([]);

  // Handle note deletion
  const handleNoteDelete = async (noteId: string) => {
    console.log('NoteList - Deleting note:', noteId);
    // Delete the note using the service
    try {
      await deleteNote(noteId);
      console.log('NoteList - Note deleted from service');

      // Add to deleted notes list to remove from UI
      setDeletedNotes([...deletedNotes, noteId]);

      // Call the parent's onNoteDelete if provided
      if (onNoteDelete) {
        onNoteDelete(noteId);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Filter out deleted notes
  const filteredNotes = notes.filter(note => !deletedNotes.includes(note.id));
  return (
    <div className="note-list">
      {filteredNotes.length === 0 ? (
        <div className="no-notes">
          <p>No notes yet. Create your first note!</p>
        </div>
      ) : (
        filteredNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onClick={onNoteClick}
            isActive={note.id === activeNoteId}
            onDelete={handleNoteDelete}
          />
        ))
      )}
    </div>
  );
};

export default NoteList;
