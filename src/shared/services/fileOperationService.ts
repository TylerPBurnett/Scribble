/**
 * Simplified File Operation Service
 * 
 * A lightweight wrapper around IPC calls to the main process for file operations.
 * This replaces the complex file operation service that was removed during cleanup.
 */

export interface FileOperationResult {
  success: boolean;
  filePath?: string;
  error?: string;
  conflictResolution?: string;
}

export interface NoteFileInfo {
  title: string;
  filePath: string;
  createdAt: Date;
  modifiedAt: Date;
  metadata: Record<string, any>;
}

/**
 * Simple file operation service that delegates to IPC calls
 */
class SimpleFileOperationService {
  
  /**
   * List all note files in directory
   */
  async listNoteFiles(directory: string): Promise<NoteFileInfo[]> {
    try {
      // Use IPC to get file list from main process
      console.log('[Frontend] DEBUG: About to call listNoteFiles IPC');
      const files = await (window as any).fileOps?.listNoteFiles(directory) || [];
      console.log('[Frontend] DEBUG: Received files from IPC:', files.length, 'items');
      console.log('[Frontend] DEBUG: First file structure:', files[0]);
      return files;
    } catch (error) {
      console.error('Failed to list note files:', error);
      return [];
    }
  }

  /**
   * Create a new note file
   */
  async createNoteFile(
    title: string,
    content: string,
    directory: string
  ): Promise<FileOperationResult> {
    try {
      // Use IPC to save note file to main process
      const result = await (window as any).fileOps?.saveNoteToFile(title, content, directory);
      
      if (result?.success) {
        return {
          success: true,
          filePath: result.filePath
        };
      } else {
        return {
          success: false,
          error: result?.error || 'Failed to create note file'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update note file content
   */
  async updateNoteFile(
    filePath: string,
    content: string
  ): Promise<FileOperationResult> {
    try {
      // Extract title from file path for IPC call
      const title = filePath.split('/').pop()?.replace('.md', '') || 'Untitled';
      const directory = filePath.substring(0, filePath.lastIndexOf('/'));
      
      const result = await (window as any).fileOps?.saveNoteToFile(title, content, directory, title);
      
      if (result?.success) {
        return {
          success: true,
          filePath: result.filePath
        };
      } else {
        return {
          success: false,
          error: result?.error || 'Failed to update note file'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rename a note file (for title changes)
   */
  async renameNoteFile(
    oldPath: string,
    newTitle: string
  ): Promise<FileOperationResult> {
    try {
      // Read current content first
      const content = await (window as any).fileOps?.readNoteFile(oldPath) || '';
      const directory = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const oldTitle = oldPath.split('/').pop()?.replace('.md', '') || 'Untitled';
      
      // Save with new title (this handles the rename via IPC)
      const result = await (window as any).fileOps?.saveNoteToFile(newTitle, content, directory, oldTitle);
      
      if (result?.success) {
        return {
          success: true,
          filePath: result.filePath
        };
      } else {
        return {
          success: false,
          error: result?.error || 'Failed to rename note file'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete note file (matches noteService interface)
   */
  async deleteNoteFile(title: string, directory: string): Promise<FileOperationResult> {
    try {
      const result = await (window as any).fileOps?.deleteNoteFile(title, directory);
      
      if (result?.success) {
        return {
          success: true,
          filePath: result.filePath
        };
      } else {
        return {
          success: false,
          error: result?.error || 'Failed to delete note file'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Read note file content
   */
  async readNoteFile(filePath: string): Promise<string> {
    try {
      const content = await (window as any).fileOps?.readNoteFile(filePath);
      return content || '';
    } catch (error) {
      console.error('Failed to read note file:', error);
      return '';
    }
  }

  /**
   * Save note to file (unified interface matching noteService expectations)
   */
  async saveNoteToFile(
    title: string,
    content: string,
    directory: string,
    oldTitle?: string
  ): Promise<FileOperationResult> {
    try {
      const result = await (window as any).fileOps?.saveNoteToFile(title, content, directory, oldTitle);
      
      if (result?.success) {
        return {
          success: true,
          filePath: result.filePath
        };
      } else {
        return {
          success: false,
          error: result?.error || 'Failed to save note file'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const fileOperationService = new SimpleFileOperationService();