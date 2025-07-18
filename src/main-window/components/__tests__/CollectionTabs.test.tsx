import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionTabs } from '../CollectionTabs';
import { collectionService } from '../../../shared/services/collectionService';
import { Note } from '../../../shared/types/Note';
import { CollectionWithNoteCount } from '../../../shared/types/Collection';

// Mock the collection service
jest.mock('../../../shared/services/collectionService');
const mockCollectionService = collectionService as jest.Mocked<typeof collectionService>;

// Mock the toast provider
jest.mock('../../../shared/components/Toast', () => ({
  useToastHelpers: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn()
  })
}));

// Mock the error handler
jest.mock('../../../shared/components/CollectionErrorBoundary', () => ({
  useCollectionErrorHandler: () => ({
    handleError: jest.fn()
  })
}));

// Mock focus management
jest.mock('../../../shared/hooks/useFocusManagement', () => ({
  useFocusManagement: () => ({
    modalRef: { current: null },
    handleKeyDown: jest.fn()
  })
}));

const mockNotes: Note[] = [
  {
    id: 'note1',
    title: 'Note 1',
    content: 'Content 1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: 'note2',
    title: 'Note 2',
    content: 'Content 2',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02')
  }
];

const mockCollections: CollectionWithNoteCount[] = [
  {
    id: 'all',
    name: 'All Notes',
    description: 'All your notes',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    noteIds: [],
    isDefault: true,
    sortOrder: 0,
    noteCount: 2
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

const defaultProps = {
  notes: mockNotes,
  activeCollectionId: 'all',
  onCollectionChange: jest.fn(),
  onCollectionsUpdate: jest.fn()
};

describe('CollectionTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectionService.getCollectionsWithCounts.mockResolvedValue(mockCollections);
    mockCollectionService.createCollection.mockResolvedValue({
      id: 'new-collection',
      name: 'New Collection',
      createdAt: new Date(),
      updatedAt: new Date(),
      noteIds: [],
      isDefault: false,
      sortOrder: 3
    });
  });

  describe('Rendering', () => {
    it('should render collection tabs correctly', async () => {
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('All Notes')).toBeInTheDocument();
        expect(screen.getByText('Work')).toBeInTheDocument();
        expect(screen.getByText('Personal')).toBeInTheDocument();
      });

      // Check note counts
      expect(screen.getByText('2')).toBeInTheDocument(); // All Notes count
      expect(screen.getAllByText('1')).toHaveLength(2); // Work and Personal counts
    });

    it('should show loading skeleton initially', () => {
      render(<CollectionTabs {...defaultProps} />);

      // Should show loading state initially
      expect(screen.getByTestId('collection-tabs-skeleton')).toBeInTheDocument();
    });

    it('should highlight active collection', async () => {
      render(<CollectionTabs {...defaultProps} activeCollectionId="work" />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        expect(workTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should show "New" button for creating collections', async () => {
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new collection/i })).toBeInTheDocument();
      });
    });
  });

  describe('Collection Navigation', () => {
    it('should call onCollectionChange when tab is clicked', async () => {
      const onCollectionChange = jest.fn();
      render(<CollectionTabs {...defaultProps} onCollectionChange={onCollectionChange} />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.click(workTab);
      });

      expect(onCollectionChange).toHaveBeenCalledWith('work');
    });

    it('should support keyboard navigation with arrow keys', async () => {
      const user = userEvent.setup();
      const onCollectionChange = jest.fn();
      render(<CollectionTabs {...defaultProps} onCollectionChange={onCollectionChange} />);

      await waitFor(() => {
        const allTab = screen.getByRole('tab', { name: /all notes collection/i });
        allTab.focus();
      });

      // Navigate right to Work tab
      await user.keyboard('{ArrowRight}');
      expect(onCollectionChange).toHaveBeenCalledWith('work');

      // Navigate right to Personal tab
      await user.keyboard('{ArrowRight}');
      expect(onCollectionChange).toHaveBeenCalledWith('personal');

      // Navigate right should wrap to All tab
      await user.keyboard('{ArrowRight}');
      expect(onCollectionChange).toHaveBeenCalledWith('all');
    });

    it('should support keyboard navigation with Home and End keys', async () => {
      const user = userEvent.setup();
      const onCollectionChange = jest.fn();
      render(<CollectionTabs {...defaultProps} activeCollectionId="work" />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        workTab.focus();
      });

      // Home should go to first tab
      await user.keyboard('{Home}');
      expect(onCollectionChange).toHaveBeenCalledWith('all');

      // End should go to last tab
      await user.keyboard('{End}');
      expect(onCollectionChange).toHaveBeenCalledWith('personal');
    });

    it('should support Enter and Space keys for activation', async () => {
      const user = userEvent.setup();
      const onCollectionChange = jest.fn();
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        workTab.focus();
      });

      await user.keyboard('{Enter}');
      expect(onCollectionChange).toHaveBeenCalledWith('work');

      onCollectionChange.mockClear();

      await user.keyboard(' ');
      expect(onCollectionChange).toHaveBeenCalledWith('work');
    });
  });

  describe('Collection Creation', () => {
    it('should open create modal when "New" button is clicked', async () => {
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        const newButton = screen.getByRole('button', { name: /create new collection/i });
        fireEvent.click(newButton);
      });

      expect(screen.getByRole('dialog', { name: /create new collection/i })).toBeInTheDocument();
    });

    it('should create collection with valid input', async () => {
      const user = userEvent.setup();
      const onCollectionsUpdate = jest.fn();
      render(<CollectionTabs {...defaultProps} onCollectionsUpdate={onCollectionsUpdate} />);

      // Open create modal
      await waitFor(() => {
        const newButton = screen.getByRole('button', { name: /create new collection/i });
        fireEvent.click(newButton);
      });

      // Fill in form
      const nameInput = screen.getByLabelText(/collection name/i);
      await user.type(nameInput, 'Test Collection');

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Test description');

      // Submit form
      const createButton = screen.getByRole('button', { name: /create collection/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCollectionService.createCollection).toHaveBeenCalledWith({
          name: 'Test Collection',
          description: 'Test description',
          color: undefined,
          icon: undefined
        });
      });

      expect(onCollectionsUpdate).toHaveBeenCalled();
    });

    it('should show validation errors for invalid input', async () => {
      render(<CollectionTabs {...defaultProps} />);

      // Open create modal
      await waitFor(() => {
        const newButton = screen.getByRole('button', { name: /create new collection/i });
        fireEvent.click(newButton);
      });

      // Try to submit without name
      const createButton = screen.getByRole('button', { name: /create collection/i });
      fireEvent.click(createButton);

      expect(screen.getByText(/collection name is required/i)).toBeInTheDocument();
    });

    it('should close modal on Escape key', async () => {
      const user = userEvent.setup();
      render(<CollectionTabs {...defaultProps} />);

      // Open create modal
      await waitFor(() => {
        const newButton = screen.getByRole('button', { name: /create new collection/i });
        fireEvent.click(newButton);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Context Menu', () => {
    it('should show context menu on right click', async () => {
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.contextMenu(workTab);
      });

      expect(screen.getByText(/edit collection/i)).toBeInTheDocument();
      expect(screen.getByText(/delete collection/i)).toBeInTheDocument();
    });

    it('should not show context menu for default collections', async () => {
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        const allTab = screen.getByRole('tab', { name: /all notes collection/i });
        fireEvent.contextMenu(allTab);
      });

      expect(screen.queryByText(/edit collection/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/delete collection/i)).not.toBeInTheDocument();
    });

    it('should open edit modal from context menu', async () => {
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.contextMenu(workTab);
      });

      const editButton = screen.getByText(/edit collection/i);
      fireEvent.click(editButton);

      expect(screen.getByRole('dialog', { name: /edit collection/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Work')).toBeInTheDocument();
    });

    it('should show delete confirmation from context menu', async () => {
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.contextMenu(workTab);
      });

      const deleteButton = screen.getByText(/delete collection/i);
      fireEvent.click(deleteButton);

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });
  });

  describe('Collection Deletion', () => {
    it('should delete collection after confirmation', async () => {
      mockCollectionService.deleteCollection.mockResolvedValue(true);
      const onCollectionChange = jest.fn();
      const onCollectionsUpdate = jest.fn();

      render(
        <CollectionTabs 
          {...defaultProps} 
          activeCollectionId="work"
          onCollectionChange={onCollectionChange}
          onCollectionsUpdate={onCollectionsUpdate}
        />
      );

      // Open context menu and delete
      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        fireEvent.contextMenu(workTab);
      });

      const deleteButton = screen.getByText(/delete collection/i);
      fireEvent.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCollectionService.deleteCollection).toHaveBeenCalledWith('work');
      });

      expect(onCollectionChange).toHaveBeenCalledWith('all'); // Should switch to default
      expect(onCollectionsUpdate).toHaveBeenCalled();
    });

    it('should support Delete key for collection deletion', async () => {
      const user = userEvent.setup();
      render(<CollectionTabs {...defaultProps} activeCollectionId="work" />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        workTab.focus();
      });

      await user.keyboard('{Delete}');

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error state when collections fail to load', async () => {
      mockCollectionService.getCollectionsWithCounts.mockRejectedValue(
        new Error('Failed to load collections')
      );

      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/unable to load collections/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry loading collections when retry button is clicked', async () => {
      mockCollectionService.getCollectionsWithCounts
        .mockRejectedValueOnce(new Error('Failed to load'))
        .mockResolvedValue(mockCollections);

      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText('All Notes')).toBeInTheDocument();
      });
    });

    it('should handle collection creation errors', async () => {
      mockCollectionService.createCollection.mockRejectedValue(
        new Error('Failed to create collection')
      );

      render(<CollectionTabs {...defaultProps} />);

      // Open create modal and submit
      await waitFor(() => {
        const newButton = screen.getByRole('button', { name: /create new collection/i });
        fireEvent.click(newButton);
      });

      const nameInput = screen.getByLabelText(/collection name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Collection' } });

      const createButton = screen.getByRole('button', { name: /create collection/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create collection/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        const tablist = screen.getByRole('tablist', { name: /collection tabs/i });
        expect(tablist).toBeInTheDocument();

        const tabs = screen.getAllByRole('tab');
        tabs.forEach(tab => {
          expect(tab).toHaveAttribute('aria-selected');
          expect(tab).toHaveAttribute('aria-controls');
          expect(tab).toHaveAttribute('aria-label');
        });
      });
    });

    it('should manage focus correctly', async () => {
      render(<CollectionTabs {...defaultProps} activeCollectionId="work" />);

      await waitFor(() => {
        const workTab = screen.getByRole('tab', { name: /work collection/i });
        expect(workTab).toHaveAttribute('tabIndex', '0');
      });

      const otherTabs = screen.getAllByRole('tab').filter(tab => 
        !tab.getAttribute('aria-label')?.includes('Work')
      );
      
      otherTabs.forEach(tab => {
        expect(tab).toHaveAttribute('tabIndex', '-1');
      });
    });

    it('should have proper modal accessibility', async () => {
      render(<CollectionTabs {...defaultProps} />);

      await waitFor(() => {
        const newButton = screen.getByRole('button', { name: /create new collection/i });
        fireEvent.click(newButton);
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });
});