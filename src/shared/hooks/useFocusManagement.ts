import { useEffect, useRef } from 'react';

/**
 * Hook for managing focus in modals and dialogs
 * Ensures proper focus management for accessibility
 */
export const useFocusManagement = (isOpen: boolean) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the modal container or first focusable element
      const focusModal = () => {
        if (modalRef.current) {
          // Try to focus the first focusable element in the modal
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
          } else {
            // Fallback to focusing the modal container
            modalRef.current.focus();
          }
        }
      };

      // Use setTimeout to ensure the modal is rendered
      setTimeout(focusModal, 0);
    } else {
      // Restore focus to the previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen]);

  // Handle Tab key to trap focus within the modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  };

  return {
    modalRef,
    handleKeyDown
  };
};

/**
 * Hook for managing focus in dropdown menus and context menus
 */
export const useDropdownFocus = (isOpen: boolean) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      // Focus the first focusable element in the dropdown
      const focusableElements = dropdownRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropdownRef.current) return;

    const focusableElements = dropdownRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        (focusableElements[nextIndex] as HTMLElement)?.focus();
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        (focusableElements[prevIndex] as HTMLElement)?.focus();
        break;
      
      case 'Home':
        e.preventDefault();
        (focusableElements[0] as HTMLElement)?.focus();
        break;
      
      case 'End':
        e.preventDefault();
        (focusableElements[focusableElements.length - 1] as HTMLElement)?.focus();
        break;
    }
  };

  return {
    dropdownRef,
    handleKeyDown
  };
};

/**
 * Hook for managing keyboard navigation in lists
 */
export const useListNavigation = (itemCount: number, onSelect?: (index: number) => void) => {
  const listRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef<number>(-1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!listRef.current) return;

    const items = listRef.current.querySelectorAll('[role="option"], [role="menuitem"], button, [tabindex="0"]');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        currentIndexRef.current = Math.min(currentIndexRef.current + 1, items.length - 1);
        (items[currentIndexRef.current] as HTMLElement)?.focus();
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        currentIndexRef.current = Math.max(currentIndexRef.current - 1, 0);
        (items[currentIndexRef.current] as HTMLElement)?.focus();
        break;
      
      case 'Home':
        e.preventDefault();
        currentIndexRef.current = 0;
        (items[0] as HTMLElement)?.focus();
        break;
      
      case 'End':
        e.preventDefault();
        currentIndexRef.current = items.length - 1;
        (items[items.length - 1] as HTMLElement)?.focus();
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect && currentIndexRef.current >= 0) {
          onSelect(currentIndexRef.current);
        }
        break;
    }
  };

  const setCurrentIndex = (index: number) => {
    currentIndexRef.current = index;
  };

  return {
    listRef,
    handleKeyDown,
    setCurrentIndex,
    currentIndex: currentIndexRef.current
  };
};