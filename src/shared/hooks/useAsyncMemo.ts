/**
 * Hook for handling async operations in memoized computations
 * Provides a way to measure performance of expensive sync operations within useMemo
 */

import { useMemo, useRef } from 'react';
// Performance measurement utilities for memoized operations

/**
 * Custom hook that combines useMemo with performance measurement
 * For synchronous operations that need performance tracking
 */
export const useMemoWithPerformance = <T>(
  factory: () => T,
  deps: React.DependencyList,
  operationName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
): T => {
  const lastMeasurement = useRef<number>(0);

  return useMemo(() => {
    if (!enabled) {
      return factory();
    }

    const startTime = performance.now();
    const result = factory();
    const duration = performance.now() - startTime;

    lastMeasurement.current = duration;

    // Log performance in development
    if (duration > 1) { // Only log if operation takes more than 1ms
      console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);
    }

    return result;
  }, deps);
};

/**
 * Hook for measuring categorization operations specifically
 */
export const useMemoizedCategorization = <T>(
  items: T[],
  categorizeFunction: (items: T[]) => { favoriteItems: T[]; otherItems: T[] },
  deps: React.DependencyList,
  operationName: string = 'categorization'
) => {
  return useMemoWithPerformance(
    () => categorizeFunction(items),
    deps,
    operationName
  );
};

/**
 * Hook for measuring sorting operations specifically
 */
export const useMemoizedSort = <T>(
  items: T[],
  sortFunction: (items: T[]) => T[],
  deps: React.DependencyList,
  operationName: string = 'sort'
) => {
  return useMemoWithPerformance(
    () => sortFunction(items),
    deps,
    operationName
  );
};

/**
 * Hook for measuring filtering operations specifically
 */
export const useMemoizedFilter = <T>(
  items: T[],
  filterFunction: (items: T[]) => T[],
  deps: React.DependencyList,
  operationName: string = 'filter'
) => {
  return useMemoWithPerformance(
    () => filterFunction(items),
    deps,
    operationName
  );
};