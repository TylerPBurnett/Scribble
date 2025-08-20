import { Note } from '../types/Note';
import { htmlToMarkdown, markdownToHtml } from '../utils/markdownUtils';
import { getSettings } from './settingsService';
import { fileNamingService } from './fileNamingService';
import { fileOperationService } from './fileOperationService';

// Define the metadata interface
interface NoteMetadata {
  color?: string;
  pinned?: boolean;
  favorite?: boolean;
  transparency?: number;
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

// Helper function to create metadata comment
const createMetadataComment = (metadata: NoteMetadata): string => {
  if (Object.keys(metadata).length === 0) {
    return '';
  }
  return `\n\n<!-- scribble-metadata: ${JSON.stringify(metadata)} -->`;
};

// Load notes directly from filesystem using IPC calls
export const loadNotes = async (directory?: string): Promise<Note[]> => {
  const settings = getSettings();
  const saveLocation = directory || settings.saveLocation;
  
  if (!saveLocation) return [];

  try {
    // Use file operation service to list note files
    const noteFiles = await fileOperationService.listNoteFiles(saveLocation);
    console.log('Frontend received noteFiles:', noteFiles.map(nf => ({ title: nf.title, filePath: nf.filePath })));
    if (!Array.isArray(noteFiles)) {
      console.error('Failed to list note files: Invalid response');
      return [];
    }

    const notes: Note[] = [];

    for (const fileInfo of noteFiles) {
      try {
        // Read the file content using IPC (returns content directly)
        console.log('Reading file:', fileInfo.filePath);
        const fileContent = await fileOperationService.readNoteFile(fileInfo.filePath);
        console.log('File content length:', fileContent?.length || 0);
        if (typeof fileContent !== 'string') {
          console.error(`Failed to read file ${fileInfo.filePath}: Invalid content`);
          continue;
        }

        // Parse metadata from HTML comments
        const { metadata, content } = parseMetadata(fileContent);
        console.log('Parsed content after metadata removal:', content.substring(0, 100) + '...');

        // Extract title from filename (primary source of truth)
        const title = fileNamingService.extractTitle(fileInfo.title);
        
        // Remove title heading from content if it exists
        let markdownContent = content;
        const headingMatch = content.match(/^# (.+)\n\n?/);
        if (headingMatch) {
          markdownContent = content.replace(/^# .+\n\n?/, '');
        }
        console.log('Markdown content after title removal:', markdownContent.substring(0, 100) + '...');

        // Convert markdown to HTML for the editor
        const htmlContent = markdownToHtml(markdownContent);
        console.log('HTML content after conversion:', htmlContent.substring(0, 100) + '...');
        
        // Debug logging for nested list conversion during loading
        if (markdownContent.includes('-') || markdownContent.includes('1.')) {
          console.log('🔄 Converting Markdown to HTML (loading):');
          console.log('Markdown:', markdownContent);
          console.log('HTML:', htmlContent);
        }

        // Create a Note object using title as the primary identifier
        const note: Note = {
          id: title, // Use title as ID in the new system
          title,
          content: htmlContent,
          createdAt: new Date(fileInfo.createdAt),
          updatedAt: new Date(fileInfo.modifiedAt),
          // Add metadata properties
          color: metadata.color,
          pinned: metadata.pinned,
          favorite: metadata.favorite,
          transparency: metadata.transparency
        };

        console.log('Created note from file:', {
          fileName: fileInfo.title,
          noteTitle: note.title,
          noteId: note.id,
          color: note.color,
          pinned: note.pinned,
          favorite: note.favorite
        });

        notes.push(note);
      } catch (error) {
        console.error(`Error processing file ${fileInfo.filePath}:`, error);
      }
    }

    return notes;
  } catch (error) {
    console.error('Error loading notes from file system:', error);
    return [];
  }
};

// Keep backward compatibility with existing code
export const getNotes = loadNotes;

// Helper function to generate unique title for new notes
const generateUniqueTitle = async (directory?: string): Promise<string> => {
  const baseTitle = 'Untitled Note';
  
  try {
    // Get all existing notes to check for conflicts
    const existingNotes = await loadNotes(directory);
    
    console.log('generateUniqueTitle - Directory:', directory);
    console.log('generateUniqueTitle - Found existing notes:', existingNotes.length);
    console.log('generateUniqueTitle - Existing titles:', existingNotes.map(note => note.title));
    
    // Extract existing filenames for conflict resolution
    const existingTitles = existingNotes.map(note => note.title);
    const existingFilenames = existingTitles.map(title => fileNamingService.generateFilename(title));
    
    console.log('generateUniqueTitle - Existing filenames:', existingFilenames);
    
    // Use file naming service to generate unique filename
    const result = fileNamingService.generateUniqueFilename(baseTitle, existingFilenames);
    
    console.log('generateUniqueTitle - Generated result:', result);
    
    // Extract title from the generated filename
    const finalTitle = fileNamingService.extractTitle(result.filename);
    console.log('generateUniqueTitle - Final title:', finalTitle);
    
    return finalTitle;
  } catch (error) {
    console.error('Error generating unique title:', error);
    // Fallback to timestamp-based unique title if there's an error
    return `${baseTitle} ${Date.now()}`;
  }
};

// Create a new note - SIMPLIFIED: Always save immediately to disk
export const createNote = async (directory?: string): Promise<Note> => {
  // Generate a unique title for the new note
  const uniqueTitle = await generateUniqueTitle(directory);
  
  // Create a new note using title as ID
  const newNote: Note = {
    id: uniqueTitle, // Use title as ID in the new system
    title: uniqueTitle,
    content: '<p></p>',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // SIMPLIFIED: Save the note immediately to disk
  // This ensures the file exists and can be renamed later
  const savedNote = await saveNote(newNote, directory);
  
  console.log('Created and saved new note to disk:', {
    id: savedNote.id,
    title: savedNote.title,
    saved: true
  });

  return savedNote;
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

// Save a note using title-based filenames - SIMPLIFIED
export const saveNote = async (note: Note, directory?: string, originalTitle?: string): Promise<Note> => {
  console.log('saveNote called with:', {
    id: note.id,
    title: note.title,
    originalTitle
  });

  const settings = getSettings();
  const saveLocation = directory || settings.saveLocation;
  
  if (!saveLocation) {
    throw new Error('No save location specified');
  }

  // Validate note title
  if (!note.title || typeof note.title !== 'string' || note.title.trim().length === 0) {
    console.error('Invalid note title:', note.title);
    throw new Error('Invalid note title provided');
  }

  try {
    // Convert HTML content to Markdown
    const markdownContent = htmlToMarkdown(note.content);

    // Add title as H1 at the beginning
    const titlePrefix = note.title ? `# ${note.title}\n\n` : '';

    // Create metadata object (excluding title since it's in the filename)
    const metadata: NoteMetadata = {};
    if (note.color) metadata.color = note.color;
    if (note.pinned !== undefined) metadata.pinned = note.pinned;
    if (note.favorite !== undefined) metadata.favorite = note.favorite;
    if (note.transparency !== undefined) metadata.transparency = note.transparency;

    // Create metadata comment
    const metadataComment = createMetadataComment(metadata);

    const fullContent = titlePrefix + markdownContent + metadataComment;

    // SIMPLIFIED: Determine if this is a rename operation
    // If originalTitle is provided and different from current title, it's a rename
    const isRename = originalTitle && originalTitle !== note.title;
    const oldTitle = isRename ? originalTitle : undefined;

    console.log('Save operation:', {
      title: note.title,
      oldTitle,
      isRename
    });

    // Use file operation service to save the note file
    const result = await fileOperationService.saveNoteToFile(
      note.title, // noteTitle
      fullContent, // content
      saveLocation, // saveLocation
      oldTitle // oldTitle - for rename detection
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to save note');
    }

    // Return updated note
    const savedNote: Note = {
      ...note,
      id: note.title, // Ensure ID matches title
      updatedAt: new Date()
    };

    console.log('Successfully saved note:', {
      title: savedNote.title,
      wasRenamed: isRename
    });

    return savedNote;
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
  }
};

// Keep backward compatibility with existing code
export const updateNote = saveNote;

// Note: findNoteFilePath function removed as it's no longer used

// Delete a note by title
export const deleteNote = async (noteTitle: string, directory?: string): Promise<void> => {
  const settings = getSettings();
  const saveLocation = directory || settings.saveLocation;
  
  if (!saveLocation) {
    throw new Error('No save location specified');
  }

  try {
    // Use file operation service to delete the note file
    const result = await fileOperationService.deleteNoteFile(noteTitle, saveLocation);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete note');
    }

    console.log('Successfully deleted note:', {
      title: noteTitle
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};

// Get a note by title (ID in the new system)
export const getNoteByTitle = async (noteTitle: string, directory?: string): Promise<Note | null> => {
  console.log('Getting note by title:', noteTitle);
  
  try {
    // Load all notes and find the matching one
    const notes = await loadNotes(directory);
    const note = notes.find(note => note.title === noteTitle);

    if (note) {
      console.log('Found note with title:', noteTitle);
      return note;
    } else {
      console.log('Note not found with title:', noteTitle);
      return null;
    }
  } catch (error) {
    console.error('Error getting note by title:', error);
    return null;
  }
};

// Get a note by ID (backward compatibility - ID is now title)
export const getNoteById = async (noteId: string, directory?: string): Promise<Note | undefined> => {
  console.log('Getting note by ID (title):', noteId);
  
  // First check if this is a transient new note (not yet saved to disk)
  // This is important for untitled notes that haven't been saved yet
  try {
    const transientNote = await (window as any).noteWindow.getTransientNewNoteData(noteId);
    if (transientNote) {
      console.log('Found transient note with ID:', noteId);
      return transientNote;
    }
  } catch (error) {
    // Ignore errors from transient note lookup
    console.log('No transient note found, checking filesystem');
  }
  
  // In the new system, ID is the title, so use getNoteByTitle
  const note = await getNoteByTitle(noteId, directory);
  return note || undefined;
};
