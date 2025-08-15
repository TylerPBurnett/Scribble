import { describe, it, expect, beforeEach } from 'vitest';
import { FileNamingServiceImpl, fileNamingService } from '../fileNamingService';

describe('FileNamingService', () => {
  let service: FileNamingServiceImpl;

  beforeEach(() => {
    service = new FileNamingServiceImpl();
  });

  describe('generateFilename', () => {
    it('should generate filename with .md extension for valid title', () => {
      expect(service.generateFilename('My Note')).toBe('My Note.md');
      expect(service.generateFilename('Simple Title')).toBe('Simple Title.md');
    });

    it('should use default title for empty or null input', () => {
      expect(service.generateFilename('')).toBe('Untitled Note.md');
      expect(service.generateFilename('   ')).toBe('Untitled Note.md');
      expect(service.generateFilename(null as any)).toBe('Untitled Note.md');
      expect(service.generateFilename(undefined as any)).toBe('Untitled Note.md');
    });

    it('should sanitize invalid characters in title', () => {
      expect(service.generateFilename('Note<with>invalid:chars')).toBe('Note(with)invalid - chars.md');
      expect(service.generateFilename('File|with"quotes')).toBe('File - with\'quotes.md');
      expect(service.generateFilename('Path\\with/slashes')).toBe('Path - with - slashes.md');
    });

    it('should handle Unicode characters correctly', () => {
      expect(service.generateFilename('Café Notes')).toBe('Café Notes.md');
      expect(service.generateFilename('日本語のノート')).toBe('日本語のノート.md');
      expect(service.generateFilename('Émojis 🚀 and symbols')).toBe('Émojis 🚀 and symbols.md');
    });

    it('should trim whitespace from title', () => {
      expect(service.generateFilename('  Trimmed Title  ')).toBe('Trimmed Title.md');
      expect(service.generateFilename('\t\nSpaced\t\n')).toBe('Spaced.md');
    });
  });

  describe('extractTitle', () => {
    it('should extract title by removing .md extension', () => {
      expect(service.extractTitle('My Note.md')).toBe('My Note');
      expect(service.extractTitle('Simple Title.md')).toBe('Simple Title');
    });

    it('should handle case-insensitive .md extension', () => {
      expect(service.extractTitle('Note.MD')).toBe('Note');
      expect(service.extractTitle('Note.Md')).toBe('Note');
    });

    it('should return default title for empty input', () => {
      expect(service.extractTitle('')).toBe('Untitled Note');
      expect(service.extractTitle('   ')).toBe('Untitled Note');
      expect(service.extractTitle(null as any)).toBe('Untitled Note');
    });

    it('should handle filenames without extension', () => {
      expect(service.extractTitle('No Extension')).toBe('No Extension');
    });

    it('should return default title if only extension remains', () => {
      expect(service.extractTitle('.md')).toBe('Untitled Note');
    });
  });

  describe('sanitizeTitle', () => {
    it('should replace invalid characters with safe alternatives', () => {
      expect(service.sanitizeTitle('Note<test>')).toBe('Note(test)');
      expect(service.sanitizeTitle('File:with:colons')).toBe('File - with - colons');
      expect(service.sanitizeTitle('Quote"marks')).toBe('Quote\'marks');
      expect(service.sanitizeTitle('Pipe|symbols')).toBe('Pipe - symbols');
      expect(service.sanitizeTitle('Question?marks')).toBe('Questionmarks');
      expect(service.sanitizeTitle('Asterisk*symbols')).toBe('Asterisksymbols');
    });

    it('should handle path separators', () => {
      expect(service.sanitizeTitle('Path\\separators')).toBe('Path - separators');
      expect(service.sanitizeTitle('Forward/slashes')).toBe('Forward - slashes');
    });

    it('should remove control characters', () => {
      expect(service.sanitizeTitle('Control\x00chars\x1f')).toBe('Controlchars');
    });

    it('should normalize multiple spaces', () => {
      expect(service.sanitizeTitle('Multiple   spaces    here')).toBe('Multiple spaces here');
      expect(service.sanitizeTitle('Tab\t\tspaces')).toBe('Tab spaces');
    });

    it('should remove leading and trailing spaces and dots', () => {
      expect(service.sanitizeTitle('  .Leading dots and spaces  ')).toBe('Leading dots and spaces');
      expect(service.sanitizeTitle('...Multiple dots...')).toBe('Multiple dots');
    });

    it('should handle reserved Windows filenames', () => {
      expect(service.sanitizeTitle('CON')).toBe('CON_note');
      expect(service.sanitizeTitle('PRN')).toBe('PRN_note');
      expect(service.sanitizeTitle('AUX')).toBe('AUX_note');
      expect(service.sanitizeTitle('NUL')).toBe('NUL_note');
      expect(service.sanitizeTitle('COM1')).toBe('COM1_note');
      expect(service.sanitizeTitle('LPT1')).toBe('LPT1_note');
    });

    it('should handle reserved names case-insensitively', () => {
      expect(service.sanitizeTitle('con')).toBe('con_note');
      expect(service.sanitizeTitle('Com1')).toBe('Com1_note');
    });

    it('should truncate long titles', () => {
      const longTitle = 'A'.repeat(300);
      const sanitized = service.sanitizeTitle(longTitle);
      expect(sanitized.length).toBeLessThanOrEqual(247); // 250 - 3 for .md extension
    });

    it('should truncate at word boundaries when possible', () => {
      const longTitle = 'This is a very long title that should be truncated at a word boundary if possible ' + 'A'.repeat(200);
      const sanitized = service.sanitizeTitle(longTitle);
      expect(sanitized.endsWith('A')).toBe(false);
      expect(sanitized.length).toBeLessThanOrEqual(247);
    });

    it('should add ellipsis when truncating without word boundary', () => {
      const longTitle = 'A'.repeat(300);
      const sanitized = service.sanitizeTitle(longTitle);
      expect(sanitized.endsWith('...')).toBe(true);
    });

    it('should return default title for empty input', () => {
      expect(service.sanitizeTitle('')).toBe('Untitled Note');
      expect(service.sanitizeTitle('   ')).toBe('Untitled Note');
      expect(service.sanitizeTitle(null as any)).toBe('Untitled Note');
    });

    it('should preserve Unicode characters', () => {
      expect(service.sanitizeTitle('Café Notes')).toBe('Café Notes');
      expect(service.sanitizeTitle('日本語のノート')).toBe('日本語のノート');
      expect(service.sanitizeTitle('Émojis 🚀 symbols')).toBe('Émojis 🚀 symbols');
    });
  });

  describe('isValidFilename', () => {
    it('should return true for valid filenames', () => {
      expect(service.isValidFilename('Valid Note.md')).toBe(true);
      expect(service.isValidFilename('Simple.md')).toBe(true);
      expect(service.isValidFilename('With Numbers 123.md')).toBe(true);
      expect(service.isValidFilename('Unicode Café.md')).toBe(true);
    });

    it('should return false for empty or null filenames', () => {
      expect(service.isValidFilename('')).toBe(false);
      expect(service.isValidFilename('   ')).toBe(false);
      expect(service.isValidFilename(null as any)).toBe(false);
      expect(service.isValidFilename(undefined as any)).toBe(false);
    });

    it('should return false for filenames with invalid characters', () => {
      expect(service.isValidFilename('Invalid<chars>.md')).toBe(false);
      expect(service.isValidFilename('Invalid>chars.md')).toBe(false);
      expect(service.isValidFilename('Invalid:chars.md')).toBe(false);
      expect(service.isValidFilename('Invalid"chars.md')).toBe(false);
      expect(service.isValidFilename('Invalid|chars.md')).toBe(false);
      expect(service.isValidFilename('Invalid?chars.md')).toBe(false);
      expect(service.isValidFilename('Invalid*chars.md')).toBe(false);
      expect(service.isValidFilename('Invalid\\chars.md')).toBe(false);
      expect(service.isValidFilename('Invalid/chars.md')).toBe(false);
    });

    it('should return false for reserved Windows filenames', () => {
      expect(service.isValidFilename('CON.md')).toBe(false);
      expect(service.isValidFilename('PRN.md')).toBe(false);
      expect(service.isValidFilename('AUX.md')).toBe(false);
      expect(service.isValidFilename('NUL.md')).toBe(false);
      expect(service.isValidFilename('COM1.md')).toBe(false);
      expect(service.isValidFilename('LPT1.md')).toBe(false);
    });

    it('should return false for filenames that are too long', () => {
      const longFilename = 'A'.repeat(300) + '.md';
      expect(service.isValidFilename(longFilename)).toBe(false);
    });

    it('should return false for filenames starting or ending with spaces or dots', () => {
      expect(service.isValidFilename(' Leading space.md')).toBe(false);
      expect(service.isValidFilename('Trailing space.md ')).toBe(false);
      expect(service.isValidFilename('.Leading dot.md')).toBe(false);
      expect(service.isValidFilename('Trailing dot.md.')).toBe(false);
    });
  });

  describe('resolveConflict', () => {
    it('should return original filename if no conflict', () => {
      const existingFiles = ['Other Note.md', 'Another Note.md'];
      expect(service.resolveConflict('My Note.md', existingFiles)).toBe('My Note.md');
    });

    it('should append (2) for first conflict', () => {
      const existingFiles = ['My Note.md', 'Other Note.md'];
      expect(service.resolveConflict('My Note.md', existingFiles)).toBe('My Note (2).md');
    });

    it('should increment number for multiple conflicts', () => {
      const existingFiles = ['My Note.md', 'My Note (2).md', 'My Note (3).md'];
      expect(service.resolveConflict('My Note.md', existingFiles)).toBe('My Note (4).md');
    });

    it('should handle gaps in numbering', () => {
      const existingFiles = ['My Note.md', 'My Note (3).md', 'My Note (5).md'];
      expect(service.resolveConflict('My Note.md', existingFiles)).toBe('My Note (2).md');
    });

    it('should handle large numbers of conflicts', () => {
      const existingFiles = [];
      for (let i = 1; i <= 100; i++) {
        if (i === 1) {
          existingFiles.push('My Note.md');
        } else {
          existingFiles.push(`My Note (${i}).md`);
        }
      }
      expect(service.resolveConflict('My Note.md', existingFiles)).toBe('My Note (101).md');
    });

    it('should use timestamp fallback for extreme conflicts', () => {
      const existingFiles = [];
      for (let i = 1; i <= 10000; i++) {
        if (i === 1) {
          existingFiles.push('My Note.md');
        } else {
          existingFiles.push(`My Note (${i}).md`);
        }
      }
      const result = service.resolveConflict('My Note.md', existingFiles);
      expect(result).toMatch(/^My Note \(\d+\)\.md$/);
      expect(result).not.toBe('My Note (10001).md'); // Should use timestamp instead
    });

    it('should handle empty existing files array', () => {
      expect(service.resolveConflict('My Note.md', [])).toBe('My Note.md');
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate filename without modification if no conflicts', () => {
      const existingFiles = ['Other Note.md'];
      const result = service.generateUniqueFilename('My Note', existingFiles);
      
      expect(result.filename).toBe('My Note.md');
      expect(result.wasModified).toBe(false);
      expect(result.originalTitle).toBe('My Note');
    });

    it('should resolve conflicts and mark as modified', () => {
      const existingFiles = ['My Note.md'];
      const result = service.generateUniqueFilename('My Note', existingFiles);
      
      expect(result.filename).toBe('My Note (2).md');
      expect(result.wasModified).toBe(true);
      expect(result.originalTitle).toBe('My Note');
    });

    it('should sanitize title and resolve conflicts', () => {
      const existingFiles = ['Note(test).md'];
      const result = service.generateUniqueFilename('Note<test>', existingFiles);
      
      expect(result.filename).toBe('Note(test) (2).md');
      expect(result.wasModified).toBe(true);
      expect(result.originalTitle).toBe('Note<test>');
    });

    it('should handle empty title', () => {
      const existingFiles: string[] = [];
      const result = service.generateUniqueFilename('', existingFiles);
      
      expect(result.filename).toBe('Untitled Note.md');
      expect(result.wasModified).toBe(false);
      expect(result.originalTitle).toBe('Untitled Note');
    });
  });

  describe('singleton instance', () => {
    it('should export a working singleton instance', () => {
      expect(fileNamingService).toBeDefined();
      expect(fileNamingService.generateFilename('Test')).toBe('Test.md');
      expect(fileNamingService.extractTitle('Test.md')).toBe('Test');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle titles with only invalid characters', () => {
      expect(service.sanitizeTitle('<>:"|?*\\/')).toBe('Untitled Note');
    });

    it('should handle titles with mixed valid and invalid characters', () => {
      expect(service.sanitizeTitle('Valid<>Invalid')).toBe('Valid()Invalid');
    });

    it('should handle very long Unicode titles', () => {
      const longUnicodeTitle = '日本語'.repeat(100);
      const sanitized = service.sanitizeTitle(longUnicodeTitle);
      expect(sanitized.length).toBeLessThanOrEqual(247);
      expect(sanitized).toMatch(/^日本語/);
    });

    it('should handle titles with only whitespace and invalid chars', () => {
      expect(service.sanitizeTitle('   <>   ')).toBe('Untitled Note');
    });

    it('should handle null and undefined in all methods gracefully', () => {
      expect(() => service.generateFilename(null as any)).not.toThrow();
      expect(() => service.extractTitle(null as any)).not.toThrow();
      expect(() => service.sanitizeTitle(null as any)).not.toThrow();
      expect(() => service.isValidFilename(null as any)).not.toThrow();
    });
  });
});