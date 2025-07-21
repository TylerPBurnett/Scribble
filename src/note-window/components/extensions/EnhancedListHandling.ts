import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// Extend the Tiptap commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    enhancedListHandling: {
      refreshListDecorations: () => ReturnType
    }
  }
}

/**
 * Enhanced List Handling Extension
 * 
 * Provides improved list functionality including:
 * - Enhanced keyboard shortcuts for list manipulation
 * - Visual indicators for nested list levels
 * - Better list reordering and restructuring
 * - Improved task list functionality with interactive checkboxes
 */
export const EnhancedListHandling = Extension.create({
  name: 'enhancedListHandling',

  // Store decoration state
  addStorage() {
    return {
      decorationState: null
    };
  },

  // Add commands for refreshing decorations
  addCommands() {
    return {
      refreshListDecorations: () => ({ state, dispatch }: { state: any, dispatch: any }) => {
        if (dispatch) {
          // Force re-calculation of decorations by triggering a transaction
          const tr = state.tr;
          // Add a meta to trigger decoration refresh
          tr.setMeta('refreshDecorations', true);
          dispatch(tr);
          return true;
        }
        return false;
      }
    };
  },



  addKeyboardShortcuts() {
    return {
      // Let Tiptap handle Tab/Shift+Tab natively for proper nesting
      // We'll only add our custom shortcuts for other functionality

      // Enhanced Enter behavior for lists
      'Enter': () => {
        const { $from } = this.editor.state.selection;
        
        // Check if we're in a list item
        if (this.editor.isActive('listItem')) {
          const listItem = $from.node($from.depth);
          
          // If the current list item is empty, exit the list
          if (listItem && listItem.textContent.trim() === '') {
            return this.editor.commands.liftListItem('listItem');
          }
          
          // For task lists, create a new unchecked task item
          if (this.editor.isActive('taskList')) {
            return this.editor.commands.splitListItem('taskItem');
          }
          
          // For regular lists, create a new list item
          return this.editor.commands.splitListItem('listItem');
        }
        
        return false;
      },

      // Backspace at the beginning of a list item to convert back to paragraph
      'Backspace': () => {
        const { $from } = this.editor.state.selection;

        // Check if cursor is at the beginning of a list item
        if ($from.parentOffset === 0 && this.editor.isActive('listItem')) {
          const listItem = $from.node($from.depth);
          
          // If it's an empty list item, lift it out of the list
          if (listItem && listItem.textContent.trim() === '') {
            return this.editor.commands.liftListItem('listItem');
          }
          
          // If it's the first item in a list, convert to paragraph
          const listParent = $from.node($from.depth - 1);
          if (listParent && $from.index($from.depth - 1) === 0) {
            return this.editor.commands.liftListItem('listItem');
          }
        }

        return false;
      },

      // Ctrl+Shift+8 for bullet list
      'Mod-Shift-8': () => {
        return (this.editor.chain().focus() as any).toggleBulletList().run();
      },

      // Ctrl+Shift+7 for ordered list
      'Mod-Shift-7': () => {
        return (this.editor.chain().focus() as any).toggleOrderedList().run();
      },

      // Ctrl+Shift+9 for task list
      'Mod-Shift-9': () => {
        return (this.editor.chain().focus() as any).toggleTaskList().run();
      },

      // Alt+Up for moving list item up
      'Alt-ArrowUp': () => {
        if (this.editor.isActive('listItem')) {
          // Manually execute the moveListItem command
          const { state, dispatch } = this.editor.view;
          const { $from } = state.selection;
          
          if (!this.editor.isActive('listItem')) {
            return false;
          }

          const listItemPos = $from.before($from.depth);
          const listItem = state.doc.nodeAt(listItemPos);
          
          if (!listItem) {
            return false;
          }

          const listPos = $from.before($from.depth - 1);
          const list = state.doc.nodeAt(listPos);
          
          if (!list) {
            return false;
          }

          const itemIndex = $from.index($from.depth - 1);
          
          if (itemIndex === 0) {
            return false; // Can't move first item up
          }

          const tr = state.tr;
          const targetIndex = itemIndex - 1;
          
          // Remove the current item
          tr.delete(listItemPos, listItemPos + listItem.nodeSize);
          
          // Calculate new position after deletion
          let newPos = listPos + 1;
          for (let i = 0; i < targetIndex; i++) {
            const child = list.child(i);
            newPos += child.nodeSize;
          }
          
          // Insert the item at the new position
          tr.insert(newPos, listItem);
          
          if (dispatch) {
            dispatch(tr);
          }
          
          return true;
        }
        return false;
      },

      // Alt+Down for moving list item down
      'Alt-ArrowDown': () => {
        if (this.editor.isActive('listItem')) {
          // Manually execute the moveListItem command
          const { state, dispatch } = this.editor.view;
          const { $from } = state.selection;
          
          if (!this.editor.isActive('listItem')) {
            return false;
          }

          const listItemPos = $from.before($from.depth);
          const listItem = state.doc.nodeAt(listItemPos);
          
          if (!listItem) {
            return false;
          }

          const listPos = $from.before($from.depth - 1);
          const list = state.doc.nodeAt(listPos);
          
          if (!list) {
            return false;
          }

          const itemIndex = $from.index($from.depth - 1);
          
          if (itemIndex === list.childCount - 1) {
            return false; // Can't move last item down
          }

          const tr = state.tr;
          const targetIndex = itemIndex + 1;
          
          // Remove the current item
          tr.delete(listItemPos, listItemPos + listItem.nodeSize);
          
          // Calculate new position after deletion
          let newPos = listPos + 1;
          for (let i = 0; i < targetIndex; i++) {
            const child = list.child(i);
            if (i !== itemIndex) {
              newPos += child.nodeSize;
            }
          }
          
          // Insert the item at the new position
          tr.insert(newPos, listItem);
          
          if (dispatch) {
            dispatch(tr);
          }
          
          return true;
        }
        return false;
      },

      // Ctrl+Alt+Right for increasing list indent
      'Mod-Alt-ArrowRight': () => {
        if (this.editor.isActive('listItem')) {
          return this.editor.commands.sinkListItem('listItem');
        }
        return false;
      },

      // Ctrl+Alt+Left for decreasing list indent
      'Mod-Alt-ArrowLeft': () => {
        if (this.editor.isActive('listItem')) {
          return this.editor.commands.liftListItem('listItem');
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    // Helper function to calculate decorations for list nesting indicators
    const calculateDecorations = (state: EditorState) => {
      const decorations: Decoration[] = [];
      
      console.log('🎨 Calculating decorations for nested lists...');
      
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'listItem') {
          // Calculate nesting level more accurately
          let level = 0;
          const $pos = state.doc.resolve(pos);
          
          // Count the number of list ancestors (bulletList, orderedList, taskList)
          // by traversing up the resolved position path
          for (let depth = $pos.depth; depth > 0; depth--) {
            const ancestorNode = $pos.node(depth);
            if (ancestorNode.type.name === 'bulletList' || 
                ancestorNode.type.name === 'orderedList' || 
                ancestorNode.type.name === 'taskList') {
              level++;
            }
          }
          
          console.log(`📝 List item at pos ${pos}, calculated level: ${level}`);
          
          // Add decoration for visual nesting indicator
          // Apply to nested lists (level > 1) for visual distinction
          if (level > 1) {
            const decoration = Decoration.node(pos, pos + node.nodeSize, {
              class: `list-item-level-${Math.min(level, 6)}`,
              'data-list-level': level.toString()
            });
            decorations.push(decoration);
            console.log(`✅ Added decoration: list-item-level-${Math.min(level, 6)}`);
          }
        }
        
        return true;
      });
      
      console.log(`🎯 Total decorations created: ${decorations.length}`);
      return DecorationSet.create(state.doc, decorations);
    };
    
    const pluginKey = new PluginKey('listLevelIndicators');
    
    return [
      // Plugin for visual list level indicators
      new Plugin({
        key: pluginKey,
        
        state: {
          init: (_config: any, state: EditorState) => {
            console.log('🚀 Initializing list decoration plugin');
            return calculateDecorations(state);
          },
          apply: (tr: any, decorationSet: DecorationSet, _oldState: EditorState, newState: EditorState) => {
            // Recalculate decorations when content changes or when explicitly requested
            if (tr.docChanged || tr.getMeta('refreshDecorations')) {
              console.log('🔄 Refreshing decorations due to content change or manual refresh');
              return calculateDecorations(newState);
            }
            // Map existing decorations to new positions
            return decorationSet.map(tr.mapping, tr.doc);
          }
        },
        
        props: {
          decorations: (state) => {
            return pluginKey.getState(state) || DecorationSet.empty;
          }
        }
      }),

      // Plugin for enhanced task list functionality
      new Plugin({
        key: new PluginKey('enhancedTaskList'),
        
        props: {
          handleClick: (view, pos, event) => {
            const target = event.target as HTMLElement;
            
            // Handle task list checkbox clicks
            if (target.classList.contains('task-list-item-checkbox')) {
              const { state, dispatch } = view;
              const $pos = state.doc.resolve(pos);
              
              // Find the task item node
              let taskItemNode = null;
              let taskItemPos = null;
              
              for (let i = $pos.depth; i >= 0; i--) {
                const node = $pos.node(i);
                if (node.type.name === 'taskItem') {
                  taskItemNode = node;
                  taskItemPos = $pos.before(i);
                  break;
                }
              }
              
              if (taskItemNode && taskItemPos !== null) {
                const isChecked = taskItemNode.attrs.checked;
                const tr = state.tr.setNodeMarkup(taskItemPos, undefined, {
                  ...taskItemNode.attrs,
                  checked: !isChecked
                });
                
                dispatch(tr);
                return true;
              }
            }
            
            return false;
          }
        }
      })
    ];
  }
});

export default EnhancedListHandling;