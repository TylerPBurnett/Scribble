# File System Cleanup Design

## Analysis Results

### ✅ What's Actually Used (Keep)
1. **Core Note Operations**
   - `src/shared/services/noteService.ts` - Active, working
   - Basic CRUD operations for notes

2. **File Naming** 
   - `src/shared/services/fileNamingService.ts` - Used for title sanitization
   - Keep basic sanitization, remove complex features

3. **Main Process File Handlers**
   - `electron/main.ts` IPC handlers - Active, working
   - Keep basic file operations

4. **Auto-refresh System**
   - IPC events for UI updates - Working perfectly
   - Keep as-is

### ❌ What's Unused (Remove)
1. **Entire Migration System** - **0 imports found in main app**
   - `src/shared/services/migrationService.ts`
   - `src/shared/components/MigrationDialog.tsx`
   - `src/shared/components/BackupManager.tsx`
   - `src/shared/components/MigrationNotificationSystem.tsx`
   - All migration tests

2. **Over-engineered File Operations** - Simplify
   - `electron/fileOperationService.ts` - Has retry logic, atomic operations
   - Simplify to basic file operations

## Cleanup Strategy

### Phase 1: Remove Migration System (Safe)
Since migration components have 0 imports in the main app, they can be safely deleted:

**Files to Delete:**
- `src/shared/services/migrationService.ts`
- `src/shared/components/MigrationDialog.tsx` 
- `src/shared/components/BackupManager.tsx`
- `src/shared/components/MigrationNotificationSystem.tsx`
- `src/shared/services/__tests__/migrationService.*.ts`
- `src/shared/components/__tests__/Migration*.test.tsx`
- `src/shared/components/__tests__/BackupManager.test.tsx`

**Impact:** None - these files are not used anywhere

### Phase 2: Simplify File Operations (Careful)
Replace complex `fileOperationService.ts` with simple operations:

**Keep:** Basic create, read, update, delete
**Remove:** Retry logic, atomic operations, complex error handling

### Phase 3: Simplify File Naming (Careful)  
Keep basic sanitization in `fileNamingService.ts`:

**Keep:** Basic character replacement
**Remove:** Unicode complexity, elaborate conflict resolution

## Expected Results
- **~1000+ lines of code removed**
- **Simpler, more maintainable codebase**
- **Identical user experience**
- **Same functionality, less complexity**