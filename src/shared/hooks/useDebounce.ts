import { useRef, useEffect, useCallback } from 'react';

/**
 * A custom hook that returns a debounced version of the provided callback function.
 * The debounced function will delay invoking the callback until after the specified
 * delay has elapsed since the last time it was invoked.
 * 
 * @param callback The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the callback function
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  // Use a ref to store the latest callback to avoid unnecessary re-renders
  const latestCallback = useRef(callback);
  
  // Update the ref whenever the callback changes
  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);
  
  // Use a ref to store the timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear the timeout when the component unmounts or when delay changes
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]);
  
  // Return a memoized debounced function
  return useCallback(
    (...args: Parameters<T>) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout
      timeoutRef.current = setTimeout(() => {
        latestCallback.current(...args);
      }, delay);
    },
    [delay] // Only recreate if delay changes
  );
}
