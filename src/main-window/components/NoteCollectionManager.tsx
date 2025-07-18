import React, { useState, useEffect } from 'react';
import { Collection } from '../../shared/types/Collection';
import { Note } from '../../shared/types/Note';
import { collectionService, CollectionError } from '../../shared/services/collectionService';
import { useCollectionErrorHandler } from '../../shared/components/CollectionErrorBoundary';
import { CollectionSpinner } from '../../shared/components/CollectionSkeleton';
import { useToastHelpers } from '../../shared/components/Toast';
import { useFocusManagement } from '../../shared/hooks/useFocusManagement';

interface NoteCollectionManagerProps {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  allNotes?: Note[]; // Add optional notes array for collection count updates
}

const NoteCollectionManager: React.FC<NoteCollectionManagerProps> = ({
  note,
  isOpen,
  onClose,
  onUpdate,
  allNotes = []
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [noteCollections, setNoteCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CollectionError | null>(null);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const { handleError } = useCollectionErrorHandler();
  const { showSuccess, showError } = useToastHelpers();
  const { modalRef, handleKeyDown } = useFocusManagement(isOpen);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, note.id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all collections
      const allCollections = await collectionService.getAllCollections();
      setCollections(allCollections.filter(c => !c.isDefault)); // Exclude "All" collection
      
      // Load collections this note belongs to
      const noteColls = await collectionService.getCollectionsForNote(note.id);
      setNoteCollections(noteColls.map(c => c.id));
    } catch (error) {
      const collectionError = error instanceof CollectionError ? error : new CollectionError(
        'UNKNOWN_ERROR' as any,
        'Failed to load collection data',
        'Unable to load collections. Please try again.',
        error instanceof Error ? error : undefined
      );
      setError(collectionError);
      handleError(collectionError, 'loadData');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCollection = async (collectionId: string, isInCollection: boolean) => {
    setOperationLoading(collectionId);
    const collection = collections.find(c => c.id === collectionId);
    const collectionName = collection?.name || 'Collection';
    
    try {
      if (isInCollection) {
        // Use the new method that handles count updates
        await collectionService.handleNoteRemovedFromCollection(collectionId, note.id, allNotes);
        setNoteCollections(prev => prev.filter(id => id !== collectionId));
        showSuccess(
          'Note removed from collection',
          `Removed from "${collectionName}"`
        );
      } else {
        // Use the new method that handles count updates
        await collectionService.handleNoteAddedToCollection(collectionId, note.id, allNotes);
        setNoteCollections(prev => [...prev, collectionId]);
        showSuccess(
          'Note added to collection',
          `Added to "${collectionName}"`
        );
      }
      
      // The onUpdate callback will trigger collection refresh in the parent component
      // but the real-time updates are now handled by the collection service subscription
      onUpdate();
    } catch (error) {
      const collectionError = error instanceof CollectionError ? error : new CollectionError(
        'UNKNOWN_ERROR' as any,
        'Failed to update collection',
        'Unable to update collection. Please try again.',
        error instanceof Error ? error : undefined
      );
      handleError(collectionError, 'handleToggleCollection');
      
      // Show user-friendly error toast
      showError(
        'Collection update failed',
        collectionError.userMessage,
        {
          label: 'Try Again',
          onClick: () => handleToggleCollection(collectionId, isInCollection)
        }
      );
    } finally {
      setOperationLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-collection-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        } else {
          handleKeyDown(e);
        }
      }}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="note-collection-title" className="text-lg font-semibold">Organize Note</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-1">
            {note.title || 'Untitled Note'}
          </h4>
          <p className="text-sm text-gray-600 line-clamp-2">
            {note.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CollectionSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 text-red-500 mb-3">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 text-center mb-4">{error.userMessage}</p>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <h5 className="text-sm font-medium text-gray-700 mb-3">
              Add to Collections
            </h5>
            
            {collections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm">No collections yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Create collections to organize your notes
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {collections.map((collection) => {
                  const isInCollection = noteCollections.includes(collection.id);
                  
                  return (
                    <label
                      key={collection.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                      htmlFor={`collection-${collection.id}`}
                    >
                      {operationLoading === collection.id ? (
                        <CollectionSpinner size="sm" />
                      ) : (
                        <input
                          id={`collection-${collection.id}`}
                          type="checkbox"
                          checked={isInCollection}
                          onChange={() => handleToggleCollection(collection.id, isInCollection)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-offset-2"
                          disabled={operationLoading !== null}
                          aria-describedby={collection.description ? `collection-desc-${collection.id}` : undefined}
                        />
                      )}
                      
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-lg">{collection.icon || '📝'}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {collection.name}
                          </div>
                          {collection.description && (
                            <div className="text-xs text-gray-500">
                              {collection.description}
                            </div>
                          )}
                        </div>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: collection.color || '#3b82f6' }}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteCollectionManager;