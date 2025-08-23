import { promises as fs } from 'fs';
import * as path from 'path';

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

// Simplified error handling - just use basic Error class

export class MainProcessFileOperationService {

  /**
   * Create a new note file (simplified)
   */
  async createNoteFile(
    title: string,
    content: string,
    directory: string
  ): Promise<FileOperationResult> {
    try {
      const filename = this.sanitizeFilename(title) + '.md';
      const filePath = path.join(directory, filename);

      // Check if file already exists
      if (await this.fileExists(filePath)) {
        return {
          success: false,
          error: 'File already exists',
          conflictResolution: filename
        };
      }

      // Ensure directory exists
      await this.ensureDirectoryExists(directory);

      // Write file directly (no atomic operation)
      await fs.writeFile(filePath, content, 'utf-8');

      return {
        success: true,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rename a note file (simplified)
   */
  async renameNoteFile(
    oldPath: string,
    newTitle: string
  ): Promise<FileOperationResult> {
    try {
      const directory = path.dirname(oldPath);
      const newFilename = this.sanitizeFilename(newTitle) + '.md';
      const newPath = path.join(directory, newFilename);

      // Check if source file exists
      if (!(await this.fileExists(oldPath))) {
        return {
          success: false,
          error: `Source file not found: ${oldPath}`
        };
      }

      // Check if target already exists
      if (await this.fileExists(newPath)) {
        // Generate conflict resolution filename
        const resolvedFilename = await this.resolveFilenameConflict(
          directory,
          newFilename
        );
        const resolvedPath = path.join(directory, resolvedFilename);

        await fs.rename(oldPath, resolvedPath);

        return {
          success: true,
          filePath: resolvedPath,
          conflictResolution: resolvedFilename
        };
      }

      // Perform simple rename
      await fs.rename(oldPath, newPath);

      return {
        success: true,
        filePath: newPath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update note file content (simplified)
   */
  async updateNoteFile(
    filePath: string,
    content: string
  ): Promise<FileOperationResult> {
    try {
      // Check if file exists
      if (!(await this.fileExists(filePath))) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      // Write file directly (no atomic operation)
      await fs.writeFile(filePath, content, 'utf-8');

      return {
        success: true,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete note file (simplified)
   */
  async deleteNoteFile(filePath: string): Promise<FileOperationResult> {
    try {
      // Check if file exists
      if (!(await this.fileExists(filePath))) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      await fs.unlink(filePath);

      return {
        success: true,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * List all note files in directory
   */
  async listNoteFiles(directory: string): Promise<NoteFileInfo[]> {
    try {
      // Ensure directory exists
      if (!(await this.directoryExists(directory))) {
        return [];
      }

      const files = await fs.readdir(directory);
      const noteFiles: NoteFileInfo[] = [];

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(directory, file);
        try {
          const stats = await fs.stat(filePath);
          const title = path.basename(file, '.md');
          const content = await fs.readFile(filePath, 'utf-8');
          const metadata = this.extractMetadata(content);

          noteFiles.push({
            title,
            filePath,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            metadata
          });
        } catch (error) {
          // Skip files that can't be read
          console.warn(`Failed to read note file ${filePath}:`, error);
        }
      }

      return noteFiles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists, create if necessary (simplified)
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Resolve filename conflicts by appending numbers
   */
  private async resolveFilenameConflict(
    directory: string,
    filename: string
  ): Promise<string> {
    const baseName = path.basename(filename, '.md');
    const extension = '.md';
    let counter = 2;

    while (true) {
      const candidateFilename = `${baseName} (${counter})${extension}`;
      const candidatePath = path.join(directory, candidateFilename);

      if (!(await this.fileExists(candidatePath))) {
        return candidateFilename;
      }

      counter++;

      // Prevent infinite loop
      if (counter > 1000) {
        throw new Error('Unable to resolve filename conflict after 1000 attempts');
      }
    }
  }

  /**
   * Sanitize filename for filesystem safety
   */
  private sanitizeFilename(title: string): string {
    // Remove or replace invalid characters
    const invalidChars = /[<>:"|?*\\/]/g;
    let sanitized = title.replace(invalidChars, '');

    // Trim whitespace and dots
    sanitized = sanitized.trim().replace(/\.+$/, '');

    // Handle empty or whitespace-only titles
    if (!sanitized) {
      sanitized = 'Untitled Note';
    }

    // Limit length (leave room for extension and conflict resolution)
    const maxLength = 200;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Read collections file
   */
  async readCollectionsFile(saveLocation: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      if (!saveLocation) {
        return { success: false, error: 'No save location provided' };
      }

      const collectionsFilePath = path.join(saveLocation, 'collections.json');

      // Check if the collections file exists
      if (!(await this.fileExists(collectionsFilePath))) {
        return { success: false, error: 'Collections file not found' };
      }

      // Read the collections data from file
      const collectionsData = await fs.readFile(collectionsFilePath, 'utf8');

      return { success: true, data: collectionsData };
    } catch (error: unknown) {
      console.error('[Main Process] Error reading collections file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error reading collections file' 
      };
    }
  }

  /**
   * Extract metadata from note content
   */
  private extractMetadata(content: string): Record<string, any> {
    const metadataRegex = /<!-- scribble-metadata: (.*?) -->/;
    const match = content.match(metadataRegex);

    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        // Invalid JSON, return empty metadata
      }
    }

    return {};
  }


}

// Export singleton instance for main process
export const mainProcessFileOperationService = new MainProcessFileOperationService();