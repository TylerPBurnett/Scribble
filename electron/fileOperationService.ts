import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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

/**
 * Atomic file write utility.
 * Writes to a temp file, syncs to disk, then renames atomically.
 * This prevents data corruption if the process crashes during write.
 */
export async function atomicWriteFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
  const directory = path.dirname(filePath);
  const filename = path.basename(filePath);

  // Generate unique temp filename to avoid collisions
  const tempFilename = `.${filename}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  const tempPath = path.join(directory, tempFilename);

  let fileHandle: fs.FileHandle | null = null;

  try {
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });

    // Write to temp file with explicit sync
    fileHandle = await fs.open(tempPath, 'w');
    await fileHandle.writeFile(content, { encoding });

    // Force write to disk (fsync) - critical for crash safety
    await fileHandle.sync();
    await fileHandle.close();
    fileHandle = null;

    // Atomic rename - this is the commit point
    // On POSIX systems, rename is atomic if source and dest are on same filesystem
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on failure
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {
        // Ignore close errors during cleanup
      }
    }

    try {
      await fs.unlink(tempPath);
    } catch {
      // Temp file may not exist, ignore
    }

    throw error;
  }
}

/**
 * Clean up orphaned temp files from crashed writes.
 * Call this on app startup.
 */
export async function cleanupOrphanedTempFiles(directory: string): Promise<number> {
  let cleanedCount = 0;

  try {
    const files = await fs.readdir(directory);

    for (const file of files) {
      // Match our temp file pattern: .filename.randomhex.tmp
      if (file.startsWith('.') && file.endsWith('.tmp')) {
        const filePath = path.join(directory, file);
        try {
          const stats = await fs.stat(filePath);
          // Only clean up temp files older than 1 minute (avoid race with active writes)
          const ageMs = Date.now() - stats.mtimeMs;
          if (ageMs > 60000) {
            await fs.unlink(filePath);
            cleanedCount++;
            console.log(`[FileOps] Cleaned up orphaned temp file: ${file}`);
          }
        } catch {
          // Ignore errors for individual files
        }
      }
    }
  } catch (error) {
    console.warn(`[FileOps] Failed to clean up temp files in ${directory}:`, error);
  }

  return cleanedCount;
}

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

      // Atomic write: temp file -> sync -> rename
      await atomicWriteFile(filePath, content);

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

      // Atomic write: temp file -> sync -> rename
      await atomicWriteFile(filePath, content);

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
   * Save collections file atomically
   */
  async saveCollectionsFile(
    saveLocation: string,
    collectionsData: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      if (!saveLocation) {
        return { success: false, error: 'No save location provided' };
      }

      const collectionsFilePath = path.join(saveLocation, 'collections.json');

      // Atomic write for collections
      await atomicWriteFile(collectionsFilePath, collectionsData, 'utf8');

      return { success: true, filePath: collectionsFilePath };
    } catch (error: unknown) {
      console.error('[FileOps] Error saving collections file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving collections file'
      };
    }
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