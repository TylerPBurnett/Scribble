import { Note } from '../types/Note';
import { htmlToMarkdown, markdownToHtml } from '../utils/markdownUtils';
import { getSettings } from './settingsService';
import { v4 as uuidv4 } from 'uuid'; // Add UUID for stable IDs

// Generate a unique ID using UUID for stability
const generateId = (): string => {
  return uuidv4(); // Use UUID for stable IDs
};

// Define the metadata interface
interface NoteMetadata {
  id?: string;
  color?: string;
  pinned?: boolean;
  favorite?: boolean;
  [key: string]: unknown;
}

// Helper function to parse metadata from HTML comments
const parseMetadata = (content: string): { metadata: NoteMetadata, content: string } => {
  // Look for metadata in HTML comment at the end of the file
  // Format: <!-- scribble-metadata: {"color":"#fff9c4","pinned":true} -->
  const metadataRegex = /<!-- scribble-metadata: (.*?) -->\s*$/;
  const match = content.match(metadataRegex);

  if (!match) {
    return { metadata: {}, content };
  }

  try {
    // Parse the JSON metadata
    const metadataJson = match[1];
    const metadata = JSON.parse(metadataJson) as NoteMetadata;

    // Remove the metadata comment from content
    const contentWithoutMetadata = content.replace(metadataRegex, '');

    return {
      metadata,
      content: contentWithoutMetadata
    };
  } catch (error) {
    console.error('Error parsing metadata JSON:', error);
    return { metadata: {}, content };
  }
};

// Get notes from file system
export const getNotes = async (): Promise<Note[]> => {
  const settings = getSettings();
  if (!settings.saveLocation) return [];

  try {
    const files = await window.fileOps.listNoteFiles(settings.saveLocation);
    const notes: Note[] = [];

    for (const file of files) {
      try {
        // Read the file content
        const fileContent = await window.fileOps.readNoteFile(file.path);

        // Parse metadata from HTML comments
        const { metadata, content } = parseMetadata(fileContent);

        // Extract title from the first line if it's a heading
        let title = file.name.replace(/\.md$/, '');
        let markdownContent = content;

        // If content starts with a markdown heading, use it as the title
        const headingMatch = content.match(/^# (.+)$/m);
        if (headingMatch) {
          title = headingMatch[1];
          // Remove the heading from the content for display
          markdownContent = content.replace(/^# .+\n\n?/, '');
        }

        // Convert markdown to HTML for the editor
        const htmlContent = markdownToHtml(markdownContent);
        
        // Debug logging for nested list conversion during loading
        if (markdownContent.includes('-') || markdownContent.includes('1.')) {
          console.log('🔄 Converting Markdown to HTML (loading):');
          console.log('Markdown:', markdownContent);
          console.log('HTML:', htmlContent);
        }

        // Use embedded ID from metadata if available, otherwise fall back to file.id
        // This ensures we use the stable UUID that was embedded in the note
        const noteId = metadata.id || file.id;
        console.log('Using noteId:', noteId, 'from', metadata.id ? 'metadata' : 'filename');

        // Create a Note object
        const note: Note = {
          id: noteId,
          title,
          content: htmlContent,
          createdAt: new Date(file.createdAt),
          updatedAt: new Date(file.modifiedAt),
          // Add metadata properties
          color: metadata.color,
          pinned: metadata.pinned,
          favorite: metadata.favorite
        };

        console.log('Created note from file:', {
          fileId: file.id,
          fileName: file.name,
          noteId: note.id,
          noteTitle: note.title,
          color: note.color,
          pinned: note.pinned,
          favorite: note.favorite
        });

        notes.push(note);
      } catch (error) {
        console.error(`Error processing file ${file.path}:`, error);
      }
    }

    // Filter out any notes that shouldn't be displayed
    // This ensures transient unsaved notes don't appear in the list
    const displayableNotes = notes.filter(note => {
      // Only show notes that are actually saved to disk
      // Notes with _unsaved flag should not appear in the list
      return !note._unsaved;
    });

    return displayableNotes;
  } catch (error) {
    console.error('Error reading notes from file system:', error);
    return [];
  }
};

// Helper function to generate unique title for new notes
const generateUniqueTitle = async (): Promise<string> => {
  const baseTitle = 'Untitled Note';
  
  try {
    // Get all existing notes to check for conflicts
    const existingNotes = await getNotes();
    
    // Find all notes that start with "Untitled Note"
    const untitledNotes = existingNotes.filter(note => 
      note.title === baseTitle || note.title.startsWith(`${baseTitle} `)
    );
    
    if (untitledNotes.length === 0) {
      return baseTitle;
    }
    
    // Find the next available number
    let number = 2;
    while (existingNotes.some(note => note.title === `${baseTitle} ${number}`)) {
      number++;
    }
    
    return `${baseTitle} ${number}`;
  } catch (error) {
    console.error('Error generating unique title:', error);
    // Fallback to timestamp-based unique title if there's an error
    return `${baseTitle} ${Date.now()}`;
  }
};

// Create a new note
export const createNote = async (): Promise<Note> => {
  // Generate a unique title for the new note
  const uniqueTitle = await generateUniqueTitle();
  
  // Create a new note with a stable UUID
  const newNote: Note = {
    id: generateId(), // This uses UUID for stability
    title: uniqueTitle,
    content: '<p></p>',
    createdAt: new Date(),
    updatedAt: new Date(),
    _isNew: true,
    _unsaved: true  // Mark as unsaved - will be saved when user adds content
  };

  // DO NOT save the note immediately - implement deferred save
  // The note will only be saved when:
  // 1. The user adds content to it
  // 2. The user changes the title from "Untitled Note"
  // This prevents empty untitled notes from cluttering the file system
  
  console.log('Created new note (not saved to disk yet):', {
    id: newNote.id,
    title: newNote.title,
    unsaved: true
  });

  return newNote;
};

// Helper function to check if note has meaningful content
const hasValidContent = (note: Note): boolean => {
  // List of empty HTML patterns that represent no real content
  const emptyHtmlPatterns = [
    '<p></p>',
    '<p><br></p>',
    '<p><br/></p>',
    '<p>&nbsp;</p>',
    '<div></div>',
    '<div><br></div>',
    '<div><br/></div>'
  ];
  
  // Check if content is truly empty
  if (!note.content || note.content.trim().length === 0) {
    return false;
  }
  
  // Check if content matches any empty pattern
  const trimmedContent = note.content.trim();
  if (emptyHtmlPatterns.includes(trimmedContent)) {
    return false;
  }
  
  // Check if content only contains whitespace and HTML tags
  const textOnly = trimmedContent.replace(/<[^>]*>/g, '').trim();
  if (textOnly.length === 0 || textOnly === '&nbsp;') {
    return false;
  }
  
  return true;
};

// Update a note
export const updateNote = async (updatedNote: Note): Promise<Note> => {
  // Check if this is an unsaved note that shouldn't be saved yet
  if (updatedNote._unsaved) {
    // Check if the note has meaningful content or a custom title
    const hasContent = hasValidContent(updatedNote);
    const hasCustomTitle = updatedNote.title && 
                          !updatedNote.title.startsWith('Untitled Note');
    
    // If the note doesn't have content or a custom title, don't save it yet
    if (!hasContent && !hasCustomTitle) {
      console.log('Skipping save for empty untitled note:', {
        id: updatedNote.id,
        title: updatedNote.title,
        hasContent,
        hasCustomTitle
      });
      // Return the note as-is, still marked as unsaved
      return {
        ...updatedNote,
        updatedAt: new Date()
      };
    }
    
    // If we get here, the note has content or a custom title, so we should save it
    console.log('First save for previously unsaved note:', {
      id: updatedNote.id,
      title: updatedNote.title,
      hasContent,
      hasCustomTitle
    });
  }

  // Get the updated note with the new timestamp
  const finalNote = {
    ...updatedNote,
    updatedAt: new Date(),
    // Remove the _isNew and _unsaved flags - the note is now being saved
    _isNew: undefined,
    _unsaved: undefined
  };

  // Save to file if a save location is set
  const settings = getSettings();
  console.log('Settings from getSettings():', settings);
  if (settings.saveLocation) {
    console.log('Save location found:', settings.saveLocation);

    // Check if this is a new note being saved for the first time
    const isFirstSave = updatedNote._isNew === true || updatedNote._unsaved === true;

    // If this is a new note being saved for the first time, handle it specially
    if (isFirstSave) {
      console.log('First update of newly created note:', {
        title: updatedNote.title
      });
      // We'll skip the file lookup since the file was just created

      // Convert HTML content to Markdown
      const markdownContent = htmlToMarkdown(finalNote.content);
      
      // Debug logging for nested list conversion
      if (finalNote.content.includes('<ol>') || finalNote.content.includes('<ul>')) {
        console.log('🔄 Converting HTML to Markdown (first save):');
        console.log('HTML:', finalNote.content);
        console.log('Markdown:', markdownContent);
      }

      // Add title as H1 at the beginning if it exists
      const titlePrefix = finalNote.title ? `# ${finalNote.title}\n\n` : '';

      // Create metadata as JSON in HTML comment at the end of the file
      const metadata: NoteMetadata = {
        // Always include the stable ID in metadata
        id: finalNote.id
      };

      if (finalNote.color) {
        metadata.color = finalNote.color;
      }
      if (finalNote.pinned !== undefined) {
        metadata.pinned = finalNote.pinned;
      }
      if (finalNote.favorite !== undefined) {
        metadata.favorite = finalNote.favorite;
      }

      // Only add metadata comment if there's actual metadata to store
      const metadataComment = Object.keys(metadata).length > 0
        ? `\n\n<!-- scribble-metadata: ${JSON.stringify(metadata)} -->`
        : '';

      const fullContent = titlePrefix + markdownContent + metadataComment;

      // Save directly with the custom title
      try {
        // Type assertion to make TypeScript happy with the boolean parameter
        const result = await window.fileOps.saveNoteToFile(
          finalNote.id,
          finalNote.title,
          fullContent,
          settings.saveLocation,
          true as unknown as string // isFirstSave flag - will be fixed in main process
        );
        console.log('First save result:', result);
        return finalNote;
      } catch (saveError) {
        console.error('Error in first saveNoteToFile:', saveError);
        return finalNote;
      }
    }

    try {
      // We no longer need to find the current file on disk
      // The main process will handle file lookup using the stable ID
      console.log('Updating existing note:', finalNote.id);

      // Convert HTML content to Markdown
      const markdownContent = htmlToMarkdown(finalNote.content);
      
      // Debug logging for nested list conversion
      if (finalNote.content.includes('<ol>') || finalNote.content.includes('<ul>')) {
        console.log('🔄 Converting HTML to Markdown (update):');
        console.log('HTML:', finalNote.content);
        console.log('Markdown:', markdownContent);
      }

      // Add title as H1 at the beginning if it exists
      const titlePrefix = finalNote.title ? `# ${finalNote.title}\n\n` : '';

      // Create metadata as JSON in HTML comment at the end of the file
      const metadata: NoteMetadata = {
        // Always include the stable ID in metadata
        id: finalNote.id
      };

      if (finalNote.color) {
        metadata.color = finalNote.color;
      }
      if (finalNote.pinned !== undefined) {
        metadata.pinned = finalNote.pinned;
      }
      if (finalNote.favorite !== undefined) {
        metadata.favorite = finalNote.favorite;
      }

      // Only add metadata comment if there's actual metadata to store
      const metadataComment = Object.keys(metadata).length > 0
        ? `\n\n<!-- scribble-metadata: ${JSON.stringify(metadata)} -->`
        : '';

      const fullContent = titlePrefix + markdownContent + metadataComment;

      // Save to file
      console.log('Calling saveNoteToFile with:', {
        id: finalNote.id,
        title: finalNote.title,
        saveLocation: settings.saveLocation,
        isFirstSave: false
      });

      try {
        // Type assertion to make TypeScript happy with the boolean parameter
        const result = await window.fileOps.saveNoteToFile(
          finalNote.id,
          finalNote.title,
          fullContent,
          settings.saveLocation,
          false as unknown as string // Not first save - will be fixed in main process
        );
        console.log('Save result:', result);
      } catch (saveError) {
        console.error('Error in saveNoteToFile:', saveError);
      }
    } catch (error) {
      console.error('Error saving note to file:', error);
    }
  } else {
    console.log('No save location found in settings');
  }

  return finalNote;
};

// Delete a note
export const deleteNote = async (noteId: string): Promise<void> => {
  // We no longer need to find the note first
  // The main process will handle finding the file using the stable ID
  const settings = getSettings();
  if (settings.saveLocation) {
    try {
      console.log('Deleting note file with ID:', noteId);

      try {
        // Add empty string as placeholder for the title parameter that will be removed in main process
        const result = await window.fileOps.deleteNoteFile(
          noteId,
          "", // Empty placeholder for title that will be removed
          settings.saveLocation
        );
        console.log('Delete note file result:', result);
      } catch (deleteError) {
        console.error('Error in deleteNoteFile:', deleteError);
      }
    } catch (error) {
      console.error('Error deleting note file:', error);
    }
  }
};

// Get a note by ID
export const getNoteById = async (noteId: string): Promise<Note | undefined> => {
  console.log('Getting note by ID:', noteId);
  
  // First check if this is a transient new note (not yet saved to disk)
  // This is important for untitled notes that haven't been saved yet
  const transientNote = await window.noteWindow.getTransientNewNoteData(noteId);
  if (transientNote) {
    console.log('Found transient note with ID:', noteId);
    return transientNote;
  }
  
  // If not transient, look in the file system
  const notes = await getNotes();

  // With stable UUIDs, we should be able to find the note directly by ID
  const note = notes.find(note => note.id === noteId);

  if (note) {
    console.log('Found note with ID:', noteId);
  } else {
    console.log('Note not found with ID:', noteId);
  }

  return note;
};
