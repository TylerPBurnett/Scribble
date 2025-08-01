/**
 * React hooks for performance monitoring and measurement
 * Provides easy integration with React components for performance tracking
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  startRenderMeasurement,
  endRenderMeasurement,
  recordMemoizationHit,
  recordMemoizationMiss,
  getComponentMetrics,
  logPerformanceMetrics,
  type PerformanceMetrics
} from '../utils/performanceUtils';

/**
 * Hook to automatically measure component render performance
 * @param componentName - Name of the component to track
 * @param enabled - Whether to enable performance tracking (defaults to development mode)
 */
export const useRenderPerformance = (
  componentName: string,
  enabled: boolean = process.env.NODE_ENV === 'development'
) => {
  const renderStartRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    // Start measurement at the beginning of render
    if (!renderStartRef.current) {
      startRenderMeasurement(componentName);
      renderStartRef.current = true;
    }

    // End measurement after render is complete
    const endMeasurement = () => {
      if (renderStartRef.current) {
        endRenderMeasurement(componentName);
        renderStartRef.current = false;
      }
    };

    // Use setTimeout to ensure measurement happens after render
    const timeoutId = setTimeout(endMeasurement, 0);

    return () => {
      clearTimeout(timeoutId);
      endMeasurement();
    };
  });

  // Return utility functions for manual tracking
  return {
    startMeasurement: useCallback(() => {
      if (enabled) {
        startRenderMeasurement(componentName);
      }
    }, [componentName, enabled]),
    
    endMeasurement: useCallback(() => {
      if (enabled) {
        return endRenderMeasurement(componentName);
      }
      return 0;
    }, [componentName, enabled]),
    
    getMetrics: useCallback(() => {
      return getComponentMetrics(componentName);
    }, [componentName]),
    
    logMetrics: useCallback(() => {
      logPerformanceMetrics(componentName);
    }, [componentName])
  };
};

/**
 * Hook to track memoization effectiveness
 * @param componentName - Name of the component to track
 * @param dependencies - Dependencies array to monitor for changes
 * @param enabled - Whether to enable memoization tracking
 */
export const useMemoizationTracking = <T extends readonly unknown[]>(
  componentName: string,
  dependencies: T,
  enabled: boolean = process.env.NODE_ENV === 'development'
) => {
  const prevDepsRef = useRef<T>();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevDepsRef.current = dependencies;
      return;
    }

    const prevDeps = prevDepsRef.current;
    if (!prevDeps) {
      recordMemoizationMiss(componentName);
      prevDepsRef.current = dependencies;
      return;
    }

    // Check if dependencies have changed
    const depsChanged = dependencies.length !== prevDeps.length ||
      dependencies.some((dep, index) => dep !== prevDeps[index]);

    if (depsChanged) {
      recordMemoizationMiss(componentName);
    } else {
      recordMemoizationHit(componentName);
    }

    prevDepsRef.current = dependencies;
  }, dependencies);

  return {
    recordHit: useCallback(() => {
      if (enabled) {
        recordMemoizationHit(componentName);
      }
    }, [componentName, enabled]),
    
    recordMiss: useCallback(() => {
      if (enabled) {
        recordMemoizationMiss(componentName);
      }
    }, [componentName, enabled])
  };
};

/**
 * Hook to measure expensive operations within components
 * @param enabled - Whether to enable operation tracking
 */
export const useOperationMeasurement = (enabled: boolean = process.env.NODE_ENV === 'development') => {
  const measureOperation = useCallback(async <T>(
    operationName: string,
    operation: () => T | Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    if (!enabled) {
      const result = await operation();
      return { result, duration: 0 };
    }

    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;
    
    console.log(`Operation "${operationName}" took ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  }, [enabled]);

  const measureSync = useCallback(<T>(
    operationName: string,
    operation: () => T
  ): { result: T; duration: number } => {
    if (!enabled) {
      const result = operation();
      return { result, duration: 0 };
    }

    const startTime = performance.now();
    const result = operation();
    const duration = performance.now() - startTime;
    
    console.log(`Operation "${operationName}" took ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  }, [enabled]);

  return {
    measureOperation,
    measureSync
  };
};

/**
 * Hook to get performance metrics for a component
 * @param componentName - Name of the component to get metrics for
 * @param autoLog - Whether to automatically log metrics on component unmount
 */
export const usePerformanceMetrics = (
  componentName: string,
  autoLog: boolean = false
) => {
  const metricsRef = useRef<PerformanceMetrics | undefined>();

  useEffect(() => {
    // Update metrics reference
    metricsRef.current = getComponentMetrics(componentName);
  });

  useEffect(() => {
    // Auto-log metrics on unmount if enabled
    return () => {
      if (autoLog) {
        logPerformanceMetrics(componentName);
      }
    };
  }, [componentName, autoLog]);

  return {
    metrics: metricsRef.current,
    getMetrics: useCallback(() => getComponentMetrics(componentName), [componentName]),
    logMetrics: useCallback(() => logPerformanceMetrics(componentName), [componentName])
  };
};

/**
 * Hook for performance debugging - provides comprehensive tracking
 * @param componentName - Name of the component
 * @param options - Configuration options
 */
export const usePerformanceDebug = (
  componentName: string,
  options: {
    trackRenders?: boolean;
    trackMemoization?: boolean;
    autoLog?: boolean;
    logInterval?: number;
  } = {}
) => {
  const {
    trackRenders = true,
    trackMemoization = true,
    autoLog = false,
    logInterval = 5000
  } = options;

  // Track renders
  const renderTracking = useRenderPerformance(componentName, trackRenders);
  
  // Track memoization (with empty deps array as default)
  const memoTracking = useMemoizationTracking(componentName, [], trackMemoization);
  
  // Get metrics
  const { metrics, logMetrics } = usePerformanceMetrics(componentName, autoLog);
  
  // Operation measurement
  const { measureOperation, measureSync } = useOperationMeasurement();

  // Auto-logging interval
  useEffect(() => {
    if (!autoLog || !logInterval) return;

    const intervalId = setInterval(() => {
      logMetrics();
    }, logInterval);

    return () => clearInterval(intervalId);
  }, [autoLog, logInterval, logMetrics]);

  return {
    metrics,
    renderTracking,
    memoTracking,
    measureOperation,
    measureSync,
    logMetrics
  };
};