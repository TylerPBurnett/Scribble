import React, { useState, useEffect, useCallback } from 'react';
import { Collection, CollectionWithNoteCount } from '../../shared/types/Collection';
import { collectionService, COLLECTION_PRESETS, COLLECTION_ICONS, CollectionError } from '../../shared/services/collectionService';
import { Note } from '../../shared/types/Note';
import { useCollectionErrorHandler } from '../../shared/components/CollectionErrorBoundary';
import { CollectionTabsSkeleton } from '../../shared/components/CollectionSkeleton';

interface CollectionTabsProps {
  notes: Note[];
  activeCollectionId: string;
  onCollectionChange: (collectionId: string) => void;
  onCollectionsUpdate: () => void;
}

const CollectionTabs: React.FC<CollectionTabsProps> = React.memo(({
  notes,
  activeCollectionId,
  onCollectionChange,
  onCollectionsUpdate
}) => {
  const [collections, setCollections] = useState<CollectionWithNoteCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CollectionError | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
  const { handleError } = useCollectionErrorHandler();
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    collection: Collection | null;
  }>({ show: false, x: 0, y: 0, collection: null });

  // Refs for focus management
  const collectionAreaRef = React.useRef<HTMLDivElement>(null);
  const activeTabRef = React.useRef<HTMLButtonElement>(null);

  // Handle keyboard navigation for the collection area
  const handleCollectionAreaKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        const currentIndex = collections.findIndex(c => c.id === activeCollectionId);
        const nextIndex = e.shiftKey
          ? (currentIndex > 0 ? currentIndex - 1 : collections.length - 1)
          : (currentIndex < collections.length - 1 ? currentIndex + 1 : 0);
        const nextCollection = collections[nextIndex];
        if (nextCollection) {
          onCollectionChange(nextCollection.id);
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        const currentIdx = collections.findIndex(c => c.id === activeCollectionId);
        const prevIndex = currentIdx > 0 ? currentIdx - 1 : collections.length - 1;
        const prevCollection = collections[prevIndex];
        if (prevCollection) {
          onCollectionChange(prevCollection.id);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        const currentIdxRight = collections.findIndex(c => c.id === activeCollectionId);
        const nextIndexRight = currentIdxRight < collections.length - 1 ? currentIdxRight + 1 : 0;
        const nextCollectionRight = collections[nextIndexRight];
        if (nextCollectionRight) {
          onCollectionChange(nextCollectionRight.id);
        }
        break;

      case 'Home':
        e.preventDefault();
        const firstCollection = collections[0];
        if (firstCollection) {
          onCollectionChange(firstCollection.id);
        }
        break;

      case 'End':
        e.preventDefault();
        const lastCollection = collections[collections.length - 1];
        if (lastCollection) {
          onCollectionChange(lastCollection.id);
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        // Already on the active collection, no need to change
        break;

      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        const activeCollection = collections.find(c => c.id === activeCollectionId);
        if (activeCollection && !activeCollection.isDefault) {
          setDeletingCollection(activeCollection);
          setShowDeleteConfirm(true);
        }
        break;
    }
  };

  // Handle focus on collection area
  const handleCollectionAreaFocus = () => {
    // When the collection area gets focus, we don't need to do anything special
    // The visual focus will be on the container, and arrow keys will work
  };


  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionIcon, setNewCollectionIcon] = useState('notes');
  const [newCollectionColor, setNewCollectionColor] = useState('#3b82f6');

  // Memoized computations for better performance (commented out unused variables)
  // const totalNoteCount = useMemo(() => {
  //   return collections.reduce((sum, collection) => sum + collection.noteCount, 0);
  // }, [collections]);

  // const hasCollections = useMemo(() => {
  //   return collections.length > 1; // More than just the default "All Notes" collection
  // }, [collections.length]);

  // const activeCollection = useMemo(() => {
  //   return collections.find(c => c.id === activeCollectionId);
  // }, [collections, activeCollectionId]);

  // Helper function to render SVG icons
  const renderIcon = (iconKey: string, className: string = "w-4 h-4") => {
    const svgString = COLLECTION_ICONS[iconKey as keyof typeof COLLECTION_ICONS];
    if (!svgString) {
      // Fallback to notes icon if icon not found
      return (
        <div className={className} dangerouslySetInnerHTML={{
          __html: COLLECTION_ICONS.notes
        }} />
      );
    }
    return (
      <div className={className} dangerouslySetInnerHTML={{
        __html: svgString
      }} />
    );
  };

  // Load collections on mount and when notes change (but debounce to avoid excessive calls)
  useEffect(() => {
    // Only reload if we don't have collections or if the number of notes changed significantly
    if (collections.length === 0 || Math.abs(collections.reduce((sum, c) => sum + c.noteCount, 0) - notes.length) > 0) {
      loadCollections();
    }
  }, [notes.length]); // Only depend on notes.length to reduce re-renders

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ show: false, x: 0, y: 0, collection: null });
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show]);

  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const collectionsWithCounts = await collectionService.getCollectionsWithCounts(notes);
      setCollections(collectionsWithCounts);
    } catch (error) {
      const collectionError = error instanceof CollectionError ? error : new CollectionError(
        'UNKNOWN_ERROR' as any,
        'Failed to load collections',
        'Unable to load collections. Please try again.',
        error instanceof Error ? error : undefined
      );
      setError(collectionError);
      handleError(collectionError, 'loadCollections');
    } finally {
      setLoading(false);
    }
  }, [notes, handleError]);

  const handleCreateCollection = useCallback(async () => {
    if (!newCollectionName.trim()) return;

    try {
      const newCollection = await collectionService.createCollection({
        name: newCollectionName.trim(),
        icon: newCollectionIcon,
        color: newCollectionColor
      });

      // Reset form
      setNewCollectionName('');
      setNewCollectionIcon('notes');
      setNewCollectionColor('#3b82f6');
      setShowCreateModal(false);

      // Refresh collections and switch to the new collection
      await loadCollections();
      onCollectionsUpdate();

      // Auto-switch to the newly created collection for better UX
      if (newCollection?.id) {
        onCollectionChange(newCollection.id);
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  }, [newCollectionName, newCollectionIcon, newCollectionColor, loadCollections, onCollectionsUpdate, onCollectionChange]);

  const handleEditCollection = useCallback(async () => {
    if (!editingCollection || !newCollectionName.trim()) return;

    try {
      await collectionService.updateCollection(editingCollection.id, {
        name: newCollectionName.trim(),
        icon: newCollectionIcon,
        color: newCollectionColor
      });

      setEditingCollection(null);
      setShowEditModal(false);

      await loadCollections();
      onCollectionsUpdate();
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  }, [editingCollection, newCollectionName, newCollectionIcon, newCollectionColor, loadCollections, onCollectionsUpdate]);

  const handleRightClick = (e: React.MouseEvent, collection: Collection) => {
    e.preventDefault();
    if (collection.isDefault) return;

    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      collection
    });
  };

  const handleContextMenuEdit = () => {
    if (contextMenu.collection) {
      openEditModal(contextMenu.collection);
      setContextMenu({ show: false, x: 0, y: 0, collection: null });
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu.collection) {
      setDeletingCollection(contextMenu.collection);
      setShowDeleteConfirm(true);
      setContextMenu({ show: false, x: 0, y: 0, collection: null });
    }
  };

  const handleDeleteCollection = async () => {
    if (!deletingCollection) return;

    try {
      await collectionService.deleteCollection(deletingCollection.id);

      // Switch to "All" if we're deleting the active collection
      if (activeCollectionId === deletingCollection.id) {
        onCollectionChange('all');
      }

      setDeletingCollection(null);
      setShowDeleteConfirm(false);
      await loadCollections();
      onCollectionsUpdate();
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection);
    setNewCollectionName(collection.name);
    setNewCollectionIcon(collection.icon || 'notes');
    setNewCollectionColor(collection.color || '#3b82f6');
    setShowEditModal(true);
  };

  const resetCreateForm = () => {
    setNewCollectionName('');
    setNewCollectionIcon('notes');
    setNewCollectionColor('#3b82f6');
    setShowCreateModal(false);
  };

  // Show loading skeleton while loading
  if (loading) {
    return <CollectionTabsSkeleton count={4} />;
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="collection-tabs px-6 py-3 bg-background-titlebar border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium">{error.userMessage}</span>
          </div>
          <button
            onClick={loadCollections}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-background-secondary hover:bg-background-tertiary text-text-secondary hover:text-text rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="collection-tabs px-2 py-2 bg-background-titlebar/80 backdrop-blur-sm border-b border-border/50">
        {/* Collection Tabs Container */}
        <div className="flex items-center gap-2">
          {/* Scrollable Collection Tabs */}
          <div
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1"
            role="tablist"
            aria-label="Collection tabs"
            tabIndex={0}
            onKeyDown={handleCollectionAreaKeyDown}
            onFocus={handleCollectionAreaFocus}
            ref={collectionAreaRef}
            style={{ outline: 'none' }}
          >
            <div className="flex items-center gap-1 min-w-max">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => onCollectionChange(collection.id)}
                  onContextMenu={(e) => handleRightClick(e, collection)}

                  role="tab"
                  aria-selected={activeCollectionId === collection.id}
                  aria-controls={`collection-panel-${collection.id}`}
                  aria-label={`${collection.name} collection with ${collection.noteCount} notes`}
                  tabIndex={-1}
                  ref={activeCollectionId === collection.id ? activeTabRef : null}
                  className={`
                  group relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap
                  focus:outline-none
                  ${activeCollectionId === collection.id
                      ? `
                      bg-background/95 backdrop-blur-sm text-foreground shadow-sm border-b-2 border-primary
                      light:bg-white light:shadow-md light:border-primary
                      dark:bg-card/90 dark:text-foreground dark:border-primary
                      dim:bg-card/90 dim:text-foreground dim:border-primary
                      rounded-t-lg
                    `
                      : `
                      text-muted-foreground hover:text-foreground hover:bg-background/50 hover:backdrop-blur-sm
                      light:hover:bg-gray-100/80 light:text-gray-600 light:hover:text-gray-800
                      dark:hover:bg-white/5 dark:text-gray-400 dark:hover:text-gray-200
                      dim:hover:bg-white/5 dim:text-gray-400 dim:hover:text-gray-200
                      rounded-lg hover:rounded-t-lg hover:rounded-b-none
                    `
                    }
                `}
                  style={{
                    ...(activeCollectionId === collection.id && collection.color && {
                      borderBottomColor: collection.color,
                    })
                  }}
                >
                  {/* Tab background with subtle gradient */}
                  {activeCollectionId === collection.id && (
                    <div
                      className="absolute inset-0 rounded-t-lg opacity-5"
                      style={{
                        background: collection.color ? `linear-gradient(135deg, ${collection.color}20, ${collection.color}05)` : undefined
                      }}
                    />
                  )}

                  <div className="relative flex items-center gap-2">
                    <div
                      className={`
                      flex items-center justify-center w-4 h-4 transition-colors
                      ${activeCollectionId === collection.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}
                    `}
                      style={{
                        color: activeCollectionId === collection.id && collection.color ? collection.color : undefined
                      }}
                    >
                      {renderIcon(collection.icon || 'notes', "w-4 h-4")}
                    </div>

                    <span className="font-medium text-xs tracking-wide">
                      {collection.name}
                    </span>

                    <span className={`
                    text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[1.25rem] text-center transition-colors
                    ${activeCollectionId === collection.id
                        ? `
                        light:bg-gray-100 light:text-gray-600
                        dark:bg-white/10 dark:text-gray-300
                        dim:bg-white/10 dim:text-gray-300
                      `
                        : `
                        light:bg-gray-100/50 light:text-gray-500
                        dark:bg-white/5 dark:text-gray-500
                        dim:bg-white/5 dim:text-gray-500
                        group-hover:bg-opacity-80
                      `
                      }
                  `}>
                      {collection.noteCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fixed Add Collection Button - Always Visible */}
          <div className="flex-shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              aria-label="Create new collection"
              className={`
                flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200
                border border-dashed border-border/50 hover:border-border
                text-muted-foreground hover:text-foreground hover:bg-background/30
                light:hover:bg-gray-50 light:text-gray-500 light:hover:text-gray-700
                dark:hover:bg-white/5 dark:text-gray-500 dark:hover:text-gray-300
                dim:hover:bg-white/5 dim:text-gray-500 dim:hover:text-gray-300
                focus:outline-none
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-collection-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetCreateForm();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              resetCreateForm();
            }
          }}
        >
          <div className="bg-background rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl border border-border">
            <h3 id="create-collection-title" className="text-lg font-semibold mb-6 text-foreground">Create New Collection</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Enter collection name..."
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Choose Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(COLLECTION_ICONS).map(([iconKey, _]) => (
                    <button
                      key={iconKey}
                      onClick={() => setNewCollectionIcon(iconKey)}
                      className={`
                        flex items-center justify-center p-3 rounded-lg border transition-all duration-200
                        ${newCollectionIcon === iconKey
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border hover:border-border-hover bg-card hover:bg-accent/50'
                        }
                      `}
                    >
                      <div className={`w-5 h-5 ${newCollectionIcon === iconKey ? 'text-primary' : 'text-muted-foreground'}`}>
                        {renderIcon(iconKey, "w-5 h-5")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Choose Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {COLLECTION_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      onClick={() => setNewCollectionColor(preset.color)}
                      className={`
                        relative flex items-center justify-center p-3 rounded-lg border transition-all duration-200
                        ${newCollectionColor === preset.color
                          ? 'border-primary shadow-sm ring-2 ring-primary/20'
                          : 'border-border hover:border-border-hover'
                        }
                      `}
                      style={{ backgroundColor: `${preset.color}15` }}
                    >
                      <div
                        className="w-6 h-6 rounded-full shadow-sm"
                        style={{ backgroundColor: preset.color }}
                      />
                      {newCollectionColor === preset.color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="pt-2 border-t border-border">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Preview
                </label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                  <div
                    className="w-5 h-5"
                    style={{ color: newCollectionColor }}
                  >
                    {renderIcon(newCollectionIcon, "w-5 h-5")}
                  </div>
                  <span className="font-medium text-foreground">
                    {newCollectionName || 'Collection Name'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    0
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={resetCreateForm}
                className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Collection Modal */}
      {showEditModal && editingCollection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl border border-border">
            <h3 className="text-lg font-semibold mb-6 text-foreground">Edit Collection</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Enter collection name..."
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Choose Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(COLLECTION_ICONS).map(([iconKey, _]) => (
                    <button
                      key={iconKey}
                      onClick={() => setNewCollectionIcon(iconKey)}
                      className={`
                        flex items-center justify-center p-3 rounded-lg border transition-all duration-200
                        ${newCollectionIcon === iconKey
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border hover:border-border-hover bg-card hover:bg-accent/50'
                        }
                      `}
                    >
                      <div className={`w-5 h-5 ${newCollectionIcon === iconKey ? 'text-primary' : 'text-muted-foreground'}`}>
                        {renderIcon(iconKey, "w-5 h-5")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Choose Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {COLLECTION_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      onClick={() => setNewCollectionColor(preset.color)}
                      className={`
                        relative flex items-center justify-center p-3 rounded-lg border transition-all duration-200
                        ${newCollectionColor === preset.color
                          ? 'border-primary shadow-sm ring-2 ring-primary/20'
                          : 'border-border hover:border-border-hover'
                        }
                      `}
                      style={{ backgroundColor: `${preset.color}15` }}
                    >
                      <div
                        className="w-6 h-6 rounded-full shadow-sm"
                        style={{ backgroundColor: preset.color }}
                      />
                      {newCollectionColor === preset.color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="pt-2 border-t border-border">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Preview
                </label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                  <div
                    className="w-5 h-5"
                    style={{ color: newCollectionColor }}
                  >
                    {renderIcon(newCollectionIcon, "w-5 h-5")}
                  </div>
                  <span className="font-medium text-foreground">
                    {newCollectionName || editingCollection?.name || 'Collection Name'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {collections.find(c => c.id === editingCollection?.id)?.noteCount || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCollection}
                disabled={!newCollectionName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && contextMenu.collection && (
        <div
          className="fixed bg-background light:bg-white border border-border rounded-lg shadow-lg py-1 z-50 min-w-[120px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={handleContextMenuEdit}
            className="w-full px-3 py-2 text-left text-xs text-text hover:bg-background-secondary transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Collection
          </button>
          <button
            onClick={handleContextMenuDelete}
            className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Collection
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingCollection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl p-6 w-full max-w-md mx-4 shadow-xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text">Delete Collection</h3>
                <p className="text-sm text-text-secondary">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-text-secondary mb-6">
              Are you sure you want to delete "<span className="font-medium text-text">{deletingCollection.name}</span>"?
              All notes in this collection will remain in your library but will no longer be organized under this collection.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingCollection(null);
                }}
                className="px-4 py-2 text-text-secondary hover:bg-background-secondary rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCollection}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

// Add display name for debugging
CollectionTabs.displayName = 'CollectionTabs';

export default CollectionTabs;