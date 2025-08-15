# File System Cleanup Requirements

## Goal
Simplify the file management system by removing unnecessary complexity while keeping what actually works.

## Current State Analysis
- ✅ **Core functionality works**: Create, edit, rename, delete notes
- ✅ **Auto-refresh works**: UI updates automatically 
- ✅ **No duplication bugs**: Fixed with simple state management
- ❌ **Over-engineered**: Complex migration, error handling, and file operations

## What to Keep
1. **Basic file operations** - Simple create/save/delete in main process
2. **Title-based filenames** - `noteTitle.md` format
3. **Auto-refresh system** - IPC events for UI updates
4. **Simple file naming** - Basic sanitization only

## What to Remove/Simplify
1. **Migration System** - Remove if not actively used
   - `MigrationService`
   - `MigrationDialog` 
   - `BackupManager`
   - Migration UI components

2. **Over-engineered File Operations** - Simplify to basic operations
   - Remove retry logic and exponential backoff
   - Remove atomic file operations
   - Keep only basic create/read/update/delete

3. **Complex File Naming** - Simplify to basic sanitization
   - Remove Unicode complexity
   - Remove elaborate conflict resolution
   - Keep simple character replacement

4. **Excessive Error Handling** - Simplify to basic error messages
   - Remove complex error types
   - Remove recovery mechanisms
   - Keep simple try/catch with user messages

## Success Criteria
- App works exactly the same for users
- Codebase is simpler and more maintainable
- No unused/dead code
- Core functionality remains intact