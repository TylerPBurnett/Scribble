import { collectionService, CollectionError, CollectionErrorType } from '../collectionService';
import { Collection, CollectionCreateInput } from '../../types/Collection';
import { Note } from '../../types/Note';

// Mock the settings service
jest.mock('../settingsService', () => ({
  getSettings: jest.fn(() => ({
    saveLocation: '/mock/path'
  })),
  getActiveCollectionId: jest.fn(() => 'all'),
  saveActiveCollectionId: jest.fn()
}));

// Mock window.fileOps
const mockFileOps = {
  saveCollectionsFile: jest.fn(),
  readCollectionsFile: jest.fn()
};

(global as any).window = {
  fileOps: mockFileOps
};

describe('CollectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    collectionService.clearCache();
  });

  describe('getAllCollections', () => {
    it('should return default collections when no file exists', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue(null);

      const collections = await collectionService.getAllCollections();

      expect(collections).toHaveLength(1);
      expect(collections[0].id).toBe('all');
      expect(collections[0].name).toBe('All Notes');
      expect(collections[0].isDefault).toBe(true);
    });

    it('should load collections from file and include defaults', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          description: 'Work notes',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          noteIds: ['note1'],
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));

      const collections = await collectionService.getAllCollections();

      expect(collections).toHaveLength(2); // 1 loaded + 1 default
      expect(collections.find(c => c.id === 'all')).toBeDefined();
      expect(collections.find(c => c.id === 'work')).toBeDefined();
    });

    it('should handle corrupted JSON data gracefully', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue('{ invalid json }');
      mockFileOps.saveCollectionsFile.mockResolvedValue({ success: true, filePath: '/mock/backup' });

      const collections = await collectionService.getAllCollections();

      expect(collections).toHaveLength(1);
      expect(collections[0].id).toBe('all');
      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalledWith(
        expect.stringContaining('Corrupted on'),
        expect.stringContaining('_backup_')
      );
    });

    it('should sanitize invalid collection data', async () => {
      const mockCollections = [
        {
          id: 'valid',
          name: 'Valid Collection',
          noteIds: ['note1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          // Missing required fields
          name: 'Invalid Collection'
        },
        {
          id: 'partial',
          name: 'Partial Collection',
          noteIds: 'not-an-array', // Invalid noteIds
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));

      const collections = await collectionService.getAllCollections();

      // Should have default + 1 valid collection (invalid ones filtered out)
      expect(collections).toHaveLength(2);
      expect(collections.find(c => c.id === 'valid')).toBeDefined();
      expect(collections.find(c => c.id === 'partial')).toBeUndefined();
    });

    it('should throw CollectionError on file system errors', async () => {
      mockFileOps.readCollectionsFile.mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(collectionService.getAllCollections()).rejects.toThrow(CollectionError);
    });
  });

  describe('createCollection', () => {
    it('should create a new collection successfully', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue('[]');
      mockFileOps.saveCollectionsFile.mockResolvedValue({ success: true, filePath: '/mock/path' });

      const input: CollectionCreateInput = {
        name: 'Test Collection',
        description: 'Test description',
        color: '#ff0000',
        icon: 'work'
      };

      const collection = await collectionService.createCollection(input);

      expect(collection.name).toBe('Test Collection');
      expect(collection.description).toBe('Test description');
      expect(collection.color).toBe('#ff0000');
      expect(collection.icon).toBe('work');
      expect(collection.id).toBeDefined();
      expect(collection.noteIds).toEqual([]);
      expect(collection.createdAt).toBeInstanceOf(Date);
      expect(collection.updatedAt).toBeInstanceOf(Date);
      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalled();
    });

    it('should handle save errors with retry logic', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue('[]');
      mockFileOps.saveCollectionsFile
        .mockRejectedValueOnce(new Error('ENOSPC: no space left'))
        .mockRejectedValueOnce(new Error('ENOSPC: no space left'))
        .mockResolvedValue({ success: true, filePath: '/mock/path' });

      const input: CollectionCreateInput = {
        name: 'Test Collection'
      };

      const collection = await collectionService.createCollection(input);

      expect(collection.name).toBe('Test Collection');
      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalledTimes(3);
    });

    it('should throw CollectionError after max retries', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue('[]');
      mockFileOps.saveCollectionsFile.mockRejectedValue(new Error('ENOSPC: no space left'));

      const input: CollectionCreateInput = {
        name: 'Test Collection'
      };

      await expect(collectionService.createCollection(input)).rejects.toThrow(CollectionError);
      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('getCollectionsWithCounts', () => {
    it('should return collections with correct note counts', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: ['note1', 'note2'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));

      const notes: Note[] = [
        { id: 'note1', title: 'Note 1', content: 'Content 1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'note2', title: 'Note 2', content: 'Content 2', createdAt: new Date(), updatedAt: new Date() },
        { id: 'note3', title: 'Note 3', content: 'Content 3', createdAt: new Date(), updatedAt: new Date() }
      ];

      const collectionsWithCounts = await collectionService.getCollectionsWithCounts(notes);

      const allCollection = collectionsWithCounts.find(c => c.id === 'all');
      const workCollection = collectionsWithCounts.find(c => c.id === 'work');

      expect(allCollection?.noteCount).toBe(3); // All notes
      expect(workCollection?.noteCount).toBe(2); // Only notes in collection
    });
  });

  describe('addNoteToCollection', () => {
    it('should add note to collection successfully', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));
      mockFileOps.saveCollectionsFile.mockResolvedValue({ success: true, filePath: '/mock/path' });

      const success = await collectionService.addNoteToCollection('work', 'note1');

      expect(success).toBe(true);
      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalled();
    });

    it('should not add duplicate notes', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: ['note1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));
      mockFileOps.saveCollectionsFile.mockResolvedValue({ success: true, filePath: '/mock/path' });

      const success = await collectionService.addNoteToCollection('work', 'note1');

      expect(success).toBe(true);
      // Should still save but not add duplicate
      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalled();
    });

    it('should return false for default collections', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue('[]');

      const success = await collectionService.addNoteToCollection('all', 'note1');

      expect(success).toBe(false);
      expect(mockFileOps.saveCollectionsFile).not.toHaveBeenCalled();
    });
  });

  describe('removeNoteFromCollection', () => {
    it('should remove note from collection successfully', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: ['note1', 'note2'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));
      mockFileOps.saveCollectionsFile.mockResolvedValue({ success: true, filePath: '/mock/path' });

      const success = await collectionService.removeNoteFromCollection('work', 'note1');

      expect(success).toBe(true);
      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalled();
    });

    it('should handle removing non-existent notes gracefully', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: ['note1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));
      mockFileOps.saveCollectionsFile.mockResolvedValue({ success: true, filePath: '/mock/path' });

      const success = await collectionService.removeNoteFromCollection('work', 'note2');

      expect(success).toBe(true);
      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalled();
    });
  });

  describe('deleteCollection', () => {
    it('should delete collection successfully', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: ['note1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));
      mockFileOps.saveCollectionsFile.mockResolvedValue({ success: true, filePath: '/mock/path' });

      const success = await collectionService.deleteCollection('work');

      expect(success).toBe(true);
      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalled();
    });

    it('should not delete default collections', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue('[]');

      const success = await collectionService.deleteCollection('all');

      expect(success).toBe(false);
      expect(mockFileOps.saveCollectionsFile).not.toHaveBeenCalled();
    });

    it('should return false for non-existent collections', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue('[]');

      const success = await collectionService.deleteCollection('non-existent');

      expect(success).toBe(false);
      expect(mockFileOps.saveCollectionsFile).not.toHaveBeenCalled();
    });
  });

  describe('Session Restoration', () => {
    it('should validate active collection successfully', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));

      const validatedId = await collectionService.validateActiveCollection('work');

      expect(validatedId).toBe('work');
    });

    it('should fallback to "all" for non-existent collections', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue('[]');

      const validatedId = await collectionService.validateActiveCollection('non-existent');

      expect(validatedId).toBe('all');
    });

    it('should initialize collections with session restoration', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));

      const result = await collectionService.initializeCollectionsWithSession();

      expect(result.collections).toHaveLength(2); // work + all
      expect(result.activeCollectionId).toBe('all'); // from mock
    });
  });

  describe('Health Check', () => {
    it('should pass health check for valid collections', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: ['note1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));

      const healthCheck = await collectionService.performHealthCheck();

      expect(healthCheck.healthy).toBe(true);
      expect(healthCheck.issues).toHaveLength(0);
    });

    it('should detect duplicate IDs', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work 1',
          noteIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        },
        {
          id: 'work', // Duplicate ID
          name: 'Work 2',
          noteIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 2
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));

      const healthCheck = await collectionService.performHealthCheck();

      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.issues).toContain('Duplicate collection IDs found');
    });

    it('should detect missing default collection', async () => {
      // Mock collections without default
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1,
          isDefault: false
        }
      ];

      // Override the default behavior to not add default collection
      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));
      
      // Clear cache and manually set collections without default
      collectionService.clearCache();
      
      const healthCheck = await collectionService.performHealthCheck();

      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.issues).toContain('Default collection missing');
    });
  });

  describe('Error Handling', () => {
    it('should create appropriate CollectionError for different error types', async () => {
      // Test permission error
      mockFileOps.readCollectionsFile.mockRejectedValue(new Error('EACCES: permission denied'));

      try {
        await collectionService.getAllCollections();
        fail('Should have thrown CollectionError');
      } catch (error) {
        expect(error).toBeInstanceOf(CollectionError);
        expect((error as CollectionError).type).toBe(CollectionErrorType.PERMISSION_ERROR);
        expect((error as CollectionError).userMessage).toContain('Permission denied');
      }
    });

    it('should handle disk space errors', async () => {
      mockFileOps.readCollectionsFile.mockResolvedValue('[]');
      mockFileOps.saveCollectionsFile.mockRejectedValue(new Error('ENOSPC: no space left'));

      const input: CollectionCreateInput = { name: 'Test' };

      try {
        await collectionService.createCollection(input);
        fail('Should have thrown CollectionError');
      } catch (error) {
        expect(error).toBeInstanceOf(CollectionError);
        expect((error as CollectionError).userMessage).toContain('disk space');
      }
    });

    it('should handle file not found errors', async () => {
      mockFileOps.readCollectionsFile.mockRejectedValue(new Error('ENOENT: file not found'));

      try {
        await collectionService.getAllCollections();
        fail('Should have thrown CollectionError');
      } catch (error) {
        expect(error).toBeInstanceOf(CollectionError);
        expect((error as CollectionError).type).toBe(CollectionErrorType.NOT_FOUND_ERROR);
        expect((error as CollectionError).userMessage).toContain('not found');
      }
    });
  });

  describe('Real-time Updates', () => {
    it('should notify listeners of collection updates', async () => {
      const listener = jest.fn();
      const unsubscribe = collectionService.subscribeToUpdates(listener);

      const notes: Note[] = [
        { id: 'note1', title: 'Note 1', content: 'Content', createdAt: new Date(), updatedAt: new Date() }
      ];

      collectionService.notifyCollectionUpdates(notes, true);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });

    it('should handle note deletion and update collections', async () => {
      const mockCollections = [
        {
          id: 'work',
          name: 'Work',
          noteIds: ['note1', 'note2'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: 1
        }
      ];

      mockFileOps.readCollectionsFile.mockResolvedValue(JSON.stringify(mockCollections));
      mockFileOps.saveCollectionsFile.mockResolvedValue({ success: true, filePath: '/mock/path' });

      const notes: Note[] = [
        { id: 'note2', title: 'Note 2', content: 'Content', createdAt: new Date(), updatedAt: new Date() }
      ];

      await collectionService.handleNoteDeleted('note1', notes);

      expect(mockFileOps.saveCollectionsFile).toHaveBeenCalled();
    });
  });
});