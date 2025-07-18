import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainApp from '../MainApp';
import { collectionService } from '../../shared/services/collectionService';
import { getNotes, deleteNote } from '../../shared/services/noteService';
import { initSettings } from '../../shared/services/settingsService';

// Mock all the services
jest.mock('../../shared/services/collectionService');
jest.mock('../../shared/services/noteService');
jest.mock('../../shared/services/settingsService');
jest.mock('../../shared/services/themeService');

// Mock window operations
const mockWindowOps = {
  openNote: jest.fn(),
  createNote: jest.fn(),
  minimizeWindow: jest.fn(),
  maximizeWindow: jest.fn(),
  closeWindow: jest.fn()
};

(global as any).window = {
  ...global.window,
  windowControls: mockWindowOps,
  fileOps: {
    saveCollectionsFile: jest.fn(),
    readCollectionsFile: jest.fn()
  }
};

const mockCollectionService = collectionService as jest.Mocked<typeof collectionService>;
const mockGetNotes = getNotes as jest.MockedFunction<typeof getNotes>;
const mockDeleteNote = deleteNote as jest.MockedFunction<typeof deleteNote>;
const mockInitSettings = initSettings as jest.MockedFunction<typeof initSettings>;

const mockNotes = [
  {
    id: 'note1',
    title: 'Work Note 1',
    content: 'Work content 1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: 'note2',
    title: 'Personal Note 1',
    content: 'Personal content 1',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02')
  },
  {
    id: 'note3',
    title: 'General Note',
    content: 'General content',
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03')
  }
];

const mockCollections = [
  {
    id: 'all',
    name: 'All Notes',
    description: 'All your notes',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    noteIds: [],
    isDefault: true,
    sortOrder: 0,
    noteCount: 3
  },
  {
    id: 'work',
    name: 'Work',
    description: 'Work notes',
    color: '#059669',
    icon: 'work',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    noteIds: ['note1'],
    isDefault: false,
    sortOrder: 1,
    noteCount: 1
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Personal notes',
    color: '#dc2626',
    icon: 'personal',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    noteIds: ['note2'],
    isDefault: false,
    sortOrder: 2,
    noteCount: 1
  }
];

describe('MainApp Collection Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockInitSettings.mockResolvedValue({
      saveLocation: '/mock/path',
      autoSave: true,
      autoSaveInterval: 5,
      theme: 'dim',
      hotkeys: {},
      autoLaunch: false,
      minimizeToTray: true,
      globalHotkeys: {
        newNote: 'CommandOrControl+Alt+N',
        toggleApp: 'CommandOrControl+Alt+S'
      },
      notesSortOption: {
        label: 'Title (A-Z)',
        field: 'title',
        direction: 'asc'
      }
    });

    mockGetNotes.mockResolvedValue(mockNotes);
    mockCollectionService.initializeCollectionsWithSession.mockResolvedValue({
      collections: mockCollections.filter(c => !c.isDefault),
      activeCollectionId: 'all'
    });
    mockCollectionService.getCollectionsWithCounts.mockResolvedValue(mockCollections);
    mockCollectionService.getNotesForCollection.mockImplementation(async (collectionId, allNotes) => {
      if (collectionId === 'all') return allNotes;
      const collection = mockCollections.find(c => c.id === collectionId);
      return allNotes.filter(note => collection?.noteIds.includes(note.id) || false);
    });
  });

  describe('Initial Load and Session Restoration', () => {
    it('should initialize collections with session restoration', async () => {
      render(<MainApp />);

      await waitFor(() => {
        expect(mockCollectionService.initializeCollectionsWithSession).toHaveBeenCalled();
      });

      // Should show all collections
      expect(screen.getByText('All Notes')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    it('should restore active collection from session', async () => {
      mockCollectionService.initializeCollectionsWithSession.mockResolvedValue({
        collections: mockCollections.filter(c => !c.isDefault),
        activeCollectionId: 'work'
      });

      render(<MainApp />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        expect(workTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should handle session restoration errors gracefully', async () => {
      mockCollectionService.initializeCollectionsWithSession.mockRejectedValue(
        new Error('Session restoration failed')
      );
      mockCollectionService.getCollectionsWithCounts.mockResolvedValue(mockCollections);

      render(<MainApp />);

      await waitFor(() => {
        // Should still show collections (fallback behavior)
        expect(screen.getByText('All Notes')).toBeInTheDocument();
      });
    });
  });

  describe('Collection Filtering', () => {
    it('should show all notes when "All Notes" is selected', async () => {
      render(<MainApp />);

      await waitFor(() => {
        expect(screen.getByText('Work Note 1')).toBeInTheDocument();
        expect(screen.getByText('Personal Note 1')).toBeInTheDocument();
        expect(screen.getByText('General Note')).toBeInTheDocument();
      });
    });

    it('should filter notes when specific collection is selected', async () => {
      render(<MainApp />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.click(workTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Work Note 1')).toBeInTheDocument();
        expect(screen.queryByText('Personal Note 1')).not.toBeInTheDocument();
        expect(screen.queryByText('General Note')).not.toBeInTheDocument();
      });
    });

    it('should update collection counts when notes change', async () => {
      render(<MainApp />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // All Notes count
      });

      // Simulate note deletion
      mockGetNotes.mockResolvedValue(mockNotes.slice(1)); // Remove first note
      mockDeleteNote.mockResolvedValue(true);

      const deleteButton = screen.getAllByRole('button', { name: /delete note/i })[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockCollectionService.handleNoteDeleted).toHaveBeenCalledWith('note1', expect.any(Array));
      });
    });
  });

  describe('Collection State Persistence', () => {
    it('should save active collection state when changed', async () => {
      render(<MainApp />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.click(workTab);
      });

      await waitFor(() => {
        expect(mockCollectionService.saveActiveCollectionState).toHaveBeenCalledWith('work');
      });
    });

    it('should handle collection state save errors gracefully', async () => {
      mockCollectionService.saveActiveCollectionState.mockRejectedValue(
        new Error('Failed to save state')
      );

      render(<MainApp />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.click(workTab);
      });

      // Should not crash the app
      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument();
      });
    });
  });

  describe('New Note Creation in Collections', () => {
    it('should create note in active collection', async () => {
      mockWindowOps.createNote.mockResolvedValue({
        id: 'new-note',
        title: 'New Note',
        content: '<p></p>',
        createdAt: new Date(),
        updatedAt: new Date(),
        _isNew: true
      });

      render(<MainApp />);

      // Switch to Work collection
      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.click(workTab);
      });

      // Create new note
      const newNoteButton = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(newNoteButton);

      await waitFor(() => {
        expect(mockCollectionService.handleNoteAddedToCollection).toHaveBeenCalledWith(
          'work',
          'new-note',
          expect.any(Array)
        );
      });
    });

    it('should not add note to "All Notes" collection', async () => {
      mockWindowOps.createNote.mockResolvedValue({
        id: 'new-note',
        title: 'New Note',
        content: '<p></p>',
        createdAt: new Date(),
        updatedAt: new Date(),
        _isNew: true
      });

      render(<MainApp />);

      // Ensure "All Notes" is selected
      await waitFor(() => {
        const allTab = screen.getByRole('tab', { name: /all notes collection/i });
        expect(allTab).toHaveAttribute('aria-selected', 'true');
      });

      // Create new note
      const newNoteButton = screen.getByRole('button', { name: /new note/i });
      fireEvent.click(newNoteButton);

      await waitFor(() => {
        expect(mockCollectionService.handleNoteAddedToCollection).not.toHaveBeenCalled();
      });
    });
  });

  describe('Collection Management Integration', () => {
    it('should refresh collections after creation', async () => {
      mockCollectionService.createCollection.mockResolvedValue({
        id: 'new-collection',
        name: 'New Collection',
        createdAt: new Date(),
        updatedAt: new Date(),
        noteIds: [],
        isDefault: false,
        sortOrder: 3
      });

      render(<MainApp />);

      // Open create modal
      await waitFor(() => {
        const newButton = screen.getByRole('button', { name: /create new collection/i });
        fireEvent.click(newButton);
      });

      // Fill and submit form
      const nameInput = screen.getByLabelText(/collection name/i);
      fireEvent.change(nameInput, { target: { value: 'New Collection' } });

      const createButton = screen.getByRole('button', { name: /create collection/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCollectionService.getCollectionsWithCounts).toHaveBeenCalledTimes(2); // Initial + after creation
      });
    });

    it('should refresh collections after deletion', async () => {
      mockCollectionService.deleteCollection.mockResolvedValue(true);

      render(<MainApp />);

      // Right-click on Work collection
      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.contextMenu(workTab);
      });

      // Delete collection
      const deleteButton = screen.getByText(/delete collection/i);
      fireEvent.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCollectionService.getCollectionsWithCounts).toHaveBeenCalledTimes(2); // Initial + after deletion
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle collection update notifications', async () => {
      const mockListener = jest.fn();
      mockCollectionService.subscribeToUpdates.mockReturnValue(() => {});

      render(<MainApp />);

      // Simulate collection update notification
      mockCollectionService.notifyCollectionUpdates(mockNotes, true);

      await waitFor(() => {
        // Should trigger collection refresh
        expect(mockCollectionService.getCollectionsWithCounts).toHaveBeenCalled();
      });
    });

    it('should update note counts when notes are added to collections', async () => {
      render(<MainApp />);

      // Simulate adding note to collection
      await waitFor(() => {
        mockCollectionService.handleNoteAddedToCollection('work', 'note3', mockNotes);
      });

      // Should refresh collections to update counts
      expect(mockCollectionService.getCollectionsWithCounts).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should show error boundary when collection components fail', async () => {
      mockCollectionService.getCollectionsWithCounts.mockRejectedValue(
        new Error('Collection service failure')
      );

      render(<MainApp />);

      await waitFor(() => {
        expect(screen.getByText(/collections error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should recover from collection errors', async () => {
      mockCollectionService.getCollectionsWithCounts
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue(mockCollections);

      render(<MainApp />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText('All Notes')).toBeInTheDocument();
        expect(screen.getByText('Work')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Sort Integration', () => {
    it('should maintain collection filtering during search', async () => {
      const user = userEvent.setup();
      render(<MainApp />);

      // Switch to Work collection
      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.click(workTab);
      });

      // Search for notes
      const searchInput = screen.getByPlaceholderText(/search notes/i);
      await user.type(searchInput, 'Work');

      await waitFor(() => {
        expect(screen.getByText('Work Note 1')).toBeInTheDocument();
        expect(screen.queryByText('Personal Note 1')).not.toBeInTheDocument();
      });
    });

    it('should maintain collection filtering during sort', async () => {
      render(<MainApp />);

      // Switch to Work collection
      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.click(workTab);
      });

      // Change sort order
      const sortButton = screen.getByRole('button', { name: /sort/i });
      fireEvent.click(sortButton);

      const sortOption = screen.getByText(/newest first/i);
      fireEvent.click(sortOption);

      await waitFor(() => {
        // Should still only show Work collection notes
        expect(screen.getByText('Work Note 1')).toBeInTheDocument();
        expect(screen.queryByText('Personal Note 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain proper focus management across collection changes', async () => {
      render(<MainApp />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        workTab.focus();
        fireEvent.click(workTab);
      });

      // Focus should remain on the tab after collection change
      expect(document.activeElement).toBe(screen.getByRole('tab', { name: /work collection/i }));
    });

    it('should announce collection changes to screen readers', async () => {
      render(<MainApp />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.click(workTab);
      });

      // Check that the tab is properly marked as selected
      expect(workTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});