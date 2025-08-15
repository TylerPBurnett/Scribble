# Requirements Document

## Introduction

This feature will redesign the note file management system to follow Obsidian-style conventions where the filename IS the note title, eliminating the complex dual-storage system currently in place. This will make the system more intuitive, reliable, and easier to maintain while providing better compatibility with external markdown tools.

## Requirements

### Requirement 1: Obsidian-Style Filename Management

**User Story:** As a user, I want note filenames to directly represent the note title, so that I can easily identify and manage my notes in the file system.

#### Acceptance Criteria

1. WHEN a user creates a new note THEN the filename SHALL be the note title with `.md` extension
2. WHEN a user renames a note THEN the file SHALL be renamed to match the new title
3. WHEN a user views notes in the file system THEN the filename SHALL be human-readable and match the note title
4. IF a filename contains invalid characters THEN the system SHALL sanitize them while preserving readability
5. IF duplicate filenames would be created THEN the system SHALL append a number suffix (e.g., "Note 2.md")

### Requirement 2: Simplified File Structure

**User Story:** As a user, I want a clean file structure without complex ID-based naming, so that my notes are portable and work with other markdown tools.

#### Acceptance Criteria

1. WHEN notes are saved THEN filenames SHALL use only the sanitized title plus `.md` extension
2. WHEN notes are loaded THEN the filename (minus extension) SHALL be used as the note title
3. WHEN metadata is stored THEN it SHALL NOT include redundant title information
4. IF a note has no title THEN it SHALL use "Untitled Note" as the filename
5. WHEN files are created THEN they SHALL be immediately recognizable by their filename

### Requirement 3: Reliable Title Synchronization

**User Story:** As a user, I want note titles to always stay in sync with filenames, so that there are no discrepancies between what I see in the app and in the file system.

#### Acceptance Criteria

1. WHEN a note title is changed THEN the file SHALL be renamed immediately
2. WHEN a file is renamed externally THEN the note title SHALL update when the note is loaded
3. WHEN title changes fail to save THEN the user SHALL be notified and the title SHALL revert
4. IF file renaming fails THEN the system SHALL retry or provide fallback behavior
5. WHEN multiple notes have the same title THEN the system SHALL handle conflicts gracefully

### Requirement 4: Robust Error Handling

**User Story:** As a user, I want the system to handle file operation errors gracefully, so that I don't lose my notes or encounter confusing states.

#### Acceptance Criteria

1. WHEN file operations fail THEN the user SHALL receive clear error messages
2. WHEN renaming fails due to conflicts THEN the system SHALL suggest alternative names
3. WHEN file system permissions prevent operations THEN the user SHALL be guided to resolve the issue
4. IF a note file is deleted externally THEN the system SHALL handle the missing file gracefully
5. WHEN recovery is possible THEN the system SHALL attempt automatic recovery

### Requirement 5: Backward Compatibility

**User Story:** As a user with existing notes, I want my current notes to continue working after the system upgrade, so that I don't lose any data.

#### Acceptance Criteria

1. WHEN the system starts with old-format notes THEN they SHALL be migrated to the new format
2. WHEN migration occurs THEN existing note content and metadata SHALL be preserved
3. WHEN old ID-based filenames are found THEN they SHALL be converted to title-based filenames
4. IF migration fails for any note THEN the original file SHALL be preserved as backup
5. WHEN migration is complete THEN users SHALL be notified of the changes

### Requirement 6: Performance Optimization

**User Story:** As a user, I want note operations to be fast and responsive, so that the app doesn't feel sluggish when managing many notes.

#### Acceptance Criteria

1. WHEN loading notes THEN the system SHALL efficiently scan the directory without complex registry lookups
2. WHEN saving notes THEN file operations SHALL be optimized to minimize disk I/O
3. WHEN renaming notes THEN the operation SHALL complete quickly without blocking the UI
4. IF many notes exist THEN the system SHALL maintain good performance
5. WHEN file watching is implemented THEN it SHALL not impact system performance

### Requirement 7: External Tool Compatibility

**User Story:** As a user, I want to be able to use external markdown editors and tools with my notes, so that I'm not locked into this specific application.

#### Acceptance Criteria

1. WHEN notes are saved THEN they SHALL be standard markdown files
2. WHEN external tools modify notes THEN the changes SHALL be reflected in the app
3. WHEN notes are created externally THEN they SHALL appear in the app
4. IF external tools rename files THEN the app SHALL recognize the changes
5. WHEN sharing notes THEN the filenames SHALL be meaningful to recipients