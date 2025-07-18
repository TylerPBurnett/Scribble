export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
  favorite?: boolean; // Flag to mark a note as favorite
  color?: string; // Color of the note (CSS color value)
  transparency?: number; // Transparency level (0-1)
  _isNew?: boolean; // Flag to indicate a new note that hasn't been saved yet
  deleted?: boolean; // Flag to indicate a note has been deleted
}
