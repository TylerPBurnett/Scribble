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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
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
        className="bg-popover border border-border rounded-xl w-full max-w-sm mx-4 shadow-2xl max-h-[70vh] overflow-hidden flex flex-col"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
        }}
        tabIndex={-1}
        onClick={(e) => {
          // Prevent any clicks inside the modal from bubbling up
          e.stopPropagation();
        }}
      >
        {/* Simple header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 id="note-collection-title" className="text-sm font-medium text-text font-twitter">
            Add to Collections
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close dialog"
            className="w-6 h-6 rounded-full hover:bg-background-notes/20 flex items-center justify-center transition-all duration-200 text-text-tertiary hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CollectionSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <p className="text-sm text-text-secondary text-center mb-4">{error.userMessage}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadData();
              }}
              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all duration-200 text-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {collections.length === 0 ? (
              <div className="text-center py-8 px-4 text-text-secondary">
                <p className="text-sm">No collections yet</p>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {collections.map((collection) => {
                  const isInCollection = noteCollections.includes(collection.id);

                  return (
                    <label
                      key={collection.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${isInCollection
                        ? 'bg-primary/10 hover:bg-primary/15'
                        : 'hover:bg-background-notes/30'
                        }`}
                      htmlFor={`collection-${collection.id}`}
                      onClick={(e) => {
                        // Prevent the label click from bubbling up
                        e.stopPropagation();
                      }}
                    >
                      {operationLoading === collection.id ? (
                        <div className="w-4 h-4 flex items-center justify-center">
                          <CollectionSpinner size="sm" />
                        </div>
                      ) : (
                        <input
                          id={`collection-${collection.id}`}
                          type="checkbox"
                          checked={isInCollection}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleCollection(collection.id, isInCollection);
                          }}
                          onClick={(e) => {
                            // Also prevent click events from bubbling
                            e.stopPropagation();
                          }}
                          className="w-4 h-4 text-primary bg-transparent border border-border rounded focus:ring-primary/50 focus:ring-1 transition-colors"
                          disabled={operationLoading !== null}
                        />
                      )}

                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-sm">{collection.icon || '📝'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text font-twitter truncate">
                            {collection.name}
                          </div>
                        </div>
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
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


      </div>
    </div>
  );
};

export default NoteCollectionManager;