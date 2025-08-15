# Simplified Testing Requirements

## Introduction

After simplifying the file system services by removing complex functionality, we need to create new, focused tests that match our simplified implementation. The old tests were testing over-engineered features we deliberately removed, so we need fresh tests that validate our core functionality without unnecessary complexity.

## Requirements

### Requirement 1: Test Core File Operations

**User Story:** As a developer, I want reliable tests for basic file operations, so that I can be confident the core note functionality works correctly.

#### Acceptance Criteria

1. WHEN the noteService loads notes THEN it SHALL successfully read notes from the filesystem
2. WHEN the noteService creates a new note THEN it SHALL generate a unique filename using the simplified naming service
3. WHEN the noteService saves a note THEN it SHALL write the note content to the correct file
4. WHEN the noteService deletes a note THEN it SHALL remove the file from the filesystem
5. WHEN file operations fail THEN the service SHALL handle errors gracefully without crashing

### Requirement 2: Test Simplified File Naming

**User Story:** As a developer, I want tests for the simplified file naming service, so that I can ensure filenames are properly sanitized and conflicts are resolved.

#### Acceptance Criteria

1. WHEN generateUniqueFilename is called with a clean title THEN it SHALL return the title with .md extension
2. WHEN generateUniqueFilename is called with a conflicting title THEN it SHALL append a number to make it unique
3. WHEN the title contains invalid characters THEN the service SHALL sanitize them appropriately
4. WHEN the title is empty or whitespace THEN the service SHALL default to "untitled"
5. WHEN the title is too long THEN the service SHALL truncate it to a safe length

### Requirement 3: Test Integration Points

**User Story:** As a developer, I want tests that verify the services work together correctly, so that I can catch integration issues early.

#### Acceptance Criteria

1. WHEN noteService creates a note THEN it SHALL use fileNamingService to generate the filename
2. WHEN noteService saves a note THEN it SHALL use fileOperationService to write the file
3. WHEN services interact THEN they SHALL handle each other's errors appropriately
4. WHEN the app starts THEN it SHALL load existing notes without errors
5. WHEN multiple operations happen in sequence THEN they SHALL not interfere with each other

### Requirement 4: Keep Tests Simple and Focused

**User Story:** As a developer, I want tests that are easy to understand and maintain, so that testing doesn't become a burden.

#### Acceptance Criteria

1. WHEN writing tests THEN each test SHALL focus on one specific behavior
2. WHEN mocking dependencies THEN mocks SHALL be simple and only mock what's necessary
3. WHEN tests fail THEN the failure reason SHALL be immediately clear
4. WHEN adding new functionality THEN tests SHALL be easy to extend
5. WHEN reviewing tests THEN they SHALL serve as documentation of expected behavior