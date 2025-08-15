/**
 * File Naming Service
 * 
 * Handles filename generation and sanitization for Obsidian-style note management
 * where filenames directly represent note titles.
 */

export interface FileNamingService {
  // Generate safe filename from title
  generateFilename(title: string): string;
  
  // Extract title from filename
  extractTitle(filename: string): string;
  
  // Handle filename conflicts
  resolveConflict(baseFilename: string, existingFiles: string[]): string;
  
  // Validate filename safety
  isValidFilename(filename: string): boolean;
  
  // Sanitize title for use as filename
  sanitizeTitle(title: string): string;
  
  // Generate filename with conflict resolution
  generateUniqueFilename(title: string, existingFiles: string[]): FileNamingResult;
}

export interface FileNamingResult {
  filename: string;
  wasModified: boolean;
  originalTitle: string;
}

/**
 * Characters that are invalid in filenames (simplified but functional)
 */
const INVALID_FILENAME_CHARS = /[<>:"|?*\\/\x00-\x1f]/g;

/**
 * Essential reserved filenames on Windows (simplified)
 */
const RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

/**
 * Maximum filename length (255 is typical filesystem limit, we use 250 to be safe)
 * This includes the .md extension
 */
const MAX_FILENAME_LENGTH = 250;
const MD_EXTENSION = '.md';
const MAX_TITLE_LENGTH = MAX_FILENAME_LENGTH - MD_EXTENSION.length;

/**
 * Default title for notes without a title
 */
const DEFAULT_TITLE = 'Untitled Note';

class FileNamingServiceImpl implements FileNamingService {
  
  /**
   * Generate a safe filename from a note title
   */
  generateFilename(title: string): string {
    if (!title || title.trim().length === 0) {
      return DEFAULT_TITLE + MD_EXTENSION;
    }

    const sanitizedTitle = this.sanitizeTitle(title.trim());
    return sanitizedTitle + MD_EXTENSION;
  }

  /**
   * Extract title from filename (removes .md extension)
   */
  extractTitle(filename: string): string {
    if (!filename) {
      return DEFAULT_TITLE;
    }

    // Remove .md extension if present
    const title = filename.replace(/\.md$/i, '');
    
    // Return default title if empty after removing extension
    return title.trim() || DEFAULT_TITLE;
  }

  /**
   * Resolve filename conflicts by appending a number suffix (simplified)
   */
  resolveConflict(baseFilename: string, existingFiles: string[]): string {
    if (!existingFiles.includes(baseFilename)) {
      return baseFilename;
    }

    // Extract base name and extension
    const baseName = baseFilename.replace(/\.md$/i, '');
    const extension = MD_EXTENSION;

    // Try appending numbers until we find a unique filename
    let counter = 2;
    let candidateFilename: string;

    do {
      candidateFilename = `${baseName} (${counter})${extension}`;
      counter++;
      
      // Simple safety check
      if (counter > 100) {
        candidateFilename = `${baseName} (${Date.now()})${extension}`;
        break;
      }
    } while (existingFiles.includes(candidateFilename));

    return candidateFilename;
  }

  /**
   * Validate if a filename is safe for filesystem use (simplified)
   */
  isValidFilename(filename: string): boolean {
    if (!filename || filename.trim().length === 0) {
      return false;
    }

    // Filenames that start or end with spaces or dots are invalid (Windows compatibility)
    if (/^[\s.]|[\s.]$/.test(filename)) {
      return false;
    }

    const trimmed = filename.trim();

    // Check for invalid characters
    if (INVALID_FILENAME_CHARS.test(trimmed)) {
      return false;
    }

    // Check for reserved names (case-insensitive)
    const nameWithoutExtension = trimmed.replace(/\.md$/i, '').toUpperCase();
    if (RESERVED_NAMES.has(nameWithoutExtension)) {
      return false;
    }

    // Check length
    if (trimmed.length > MAX_FILENAME_LENGTH) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize a title for use as a filename (simplified but functional)
   */
  sanitizeTitle(title: string): string {
    if (!title || title.trim().length === 0) {
      return DEFAULT_TITLE;
    }

    let sanitized = title.trim();

    // Replace invalid characters with safe alternatives
    sanitized = sanitized.replace(INVALID_FILENAME_CHARS, (match) => {
      switch (match) {
        case '<': return '(';
        case '>': return ')';
        case ':': return ' - ';
        case '"': return "'";
        case '|': return ' - ';
        case '\\': return ' - ';
        case '/': return ' - ';
        default: return ''; // Remove control characters
      }
    });

    // Normalize whitespace and remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '');

    // Use default if empty after sanitization or only contains replacement chars
    if (!sanitized || sanitized.match(/^[\(\)\-\s']+$/)) {
      return DEFAULT_TITLE;
    }

    // Check if the result is a reserved name
    if (RESERVED_NAMES.has(sanitized.toUpperCase())) {
      sanitized = `${sanitized}_note`;
    }

    // Simple length truncation
    if (sanitized.length > MAX_TITLE_LENGTH) {
      sanitized = sanitized.substring(0, MAX_TITLE_LENGTH - 3) + '...';
    }

    return sanitized;
  }

  /**
   * Generate filename with conflict resolution
   */
  generateUniqueFilename(title: string, existingFiles: string[]): FileNamingResult {
    const originalTitle = title || DEFAULT_TITLE;
    const baseFilename = this.generateFilename(originalTitle);
    const finalFilename = this.resolveConflict(baseFilename, existingFiles);
    
    return {
      filename: finalFilename,
      wasModified: finalFilename !== baseFilename,
      originalTitle
    };
  }
}

// Export singleton instance
export const fileNamingService: FileNamingService = new FileNamingServiceImpl();

// Export class for testing
export { FileNamingServiceImpl };