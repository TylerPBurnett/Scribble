import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fileOperationService } from '../fileOperationService';
import { mockFileOps } from '../../../test/setup';

// These tests validate the renderer-side SimpleFileOperationService
// delegates correctly to IPC (window.fileOps) and wraps responses.

describe('SimpleFileOperationService (renderer) - IPC delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listNoteFiles delegates to window.fileOps and returns data', async () => {
    const now = new Date();
    const notes = [
      {
        title: 'Note 1',
        filePath: '/tmp/Note 1.md',
        createdAt: now.toISOString(),
        modifiedAt: now.toISOString(),
        metadata: { color: '#fff' },
      },
      {
        title: 'Note 2',
        filePath: '/tmp/Note 2.md',
        createdAt: now.toISOString(),
        modifiedAt: now.toISOString(),
        metadata: {},
      },
    ];

    mockFileOps.listNoteFiles.mockResolvedValueOnce(notes);

    const result = await fileOperationService.listNoteFiles('/notes');
    expect(mockFileOps.listNoteFiles).toHaveBeenCalledWith('/notes');
    expect(result).toEqual(notes);
  });

  it('createNoteFile succeeds and returns filePath', async () => {
    mockFileOps.saveNoteToFile.mockResolvedValueOnce({ success: true, filePath: '/notes/Test.md' });
    const result = await fileOperationService.createNoteFile('Test', '# Test', '/notes');
    expect(mockFileOps.saveNoteToFile).toHaveBeenCalledWith('Test', '# Test', '/notes');
    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/notes/Test.md');
  });

  it('createNoteFile handles failure', async () => {
    mockFileOps.saveNoteToFile.mockResolvedValueOnce({ success: false, error: 'oops' });
    const result = await fileOperationService.createNoteFile('Test', '# Test', '/notes');
    expect(result.success).toBe(false);
    expect(result.error).toBe('oops');
  });

  it('updateNoteFile delegates using derived title and directory', async () => {
    mockFileOps.saveNoteToFile.mockResolvedValueOnce({ success: true, filePath: '/notes/Test.md' });
    const result = await fileOperationService.updateNoteFile('/notes/Test.md', '# Updated');
    expect(mockFileOps.saveNoteToFile).toHaveBeenCalledWith('Test', '# Updated', '/notes', 'Test');
    expect(result.success).toBe(true);
  });

  it('renameNoteFile reads then saves with new title', async () => {
    mockFileOps.readNoteFile.mockResolvedValueOnce('# Old Title');
    mockFileOps.saveNoteToFile.mockResolvedValueOnce({ success: true, filePath: '/notes/New.md' });
    const result = await fileOperationService.renameNoteFile('/notes/Old.md', 'New');
    expect(mockFileOps.readNoteFile).toHaveBeenCalledWith('/notes/Old.md');
    expect(mockFileOps.saveNoteToFile).toHaveBeenCalledWith('New', '# Old Title', '/notes', 'Old');
    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/notes/New.md');
  });

  it('deleteNoteFile delegates and returns result', async () => {
    mockFileOps.deleteNoteFile.mockResolvedValueOnce({ success: true, filePath: '/notes/Test.md' });
    const result = await fileOperationService.deleteNoteFile('Test.md', '/notes');
    expect(mockFileOps.deleteNoteFile).toHaveBeenCalledWith('Test.md', '/notes');
    expect(result.success).toBe(true);
  });

  it('readNoteFile delegates and returns content', async () => {
    mockFileOps.readNoteFile.mockResolvedValueOnce('# Content');
    const result = await fileOperationService.readNoteFile('/notes/Test.md');
    expect(mockFileOps.readNoteFile).toHaveBeenCalledWith('/notes/Test.md');
    expect(result).toBe('# Content');
  });

  it('saveNoteToFile delegates and wraps response', async () => {
    mockFileOps.saveNoteToFile.mockResolvedValueOnce({ success: true, filePath: '/notes/T.md' });
    const result = await fileOperationService.saveNoteToFile('T', 'c', '/notes');
    expect(mockFileOps.saveNoteToFile).toHaveBeenCalledWith('T', 'c', '/notes', undefined);
    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/notes/T.md');
  });
});
