/**
 * Hook for managing the performance dashboard visibility and state
 */

import { useState, useCallback, useEffect } from 'react';

export const usePerformanceDashboard = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Toggle dashboard visibility
  const toggleDashboard = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Show dashboard
  const showDashboard = useCallback(() => {
    setIsVisible(true);
  }, []);

  // Hide dashboard
  const hideDashboard = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Keyboard shortcut to toggle dashboard (Ctrl/Cmd + Shift + P)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (process.env.NODE_ENV !== 'development') return;
      
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        toggleDashboard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDashboard]);

  return {
    isVisible,
    toggleDashboard,
    showDashboard,
    hideDashboard
  };
};