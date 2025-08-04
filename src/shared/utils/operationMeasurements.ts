/**
 * Specialized performance measurement utilities for common expensive operations
 * Provides convenient wrappers for measuring sorting, filtering, and other operations
 */

import { measureOperation } from './performanceUtils';
import { logPerformanceInfo } from './performanceLogger';
import type { Note } from '../types/Note';
import type { SortOption } from '../services/settingsService';

// Measurement results interface
export interface OperationMeasurement {
  duration: number;
  itemCount: number;
  operationType: string;
  details?: Record<string, any>;
}

/**
 * Measure sorting operations performance
 */
export const measureSortOperation = async <T>(
  items: T[],
  sortFunction: (items: T[]) => T[],
  operationName: string = 'sort'
): Promise<{ result: T[]; measurement: OperationMeasurement }> => {
  const { result, duration } = await measureOperation(
    `${operationName}-${items.length}-items`,
    () => sortFunction(items)
  );

  const measurement: OperationMeasurement = {
    duration,
    itemCount: items.length,
    operationType: 'sort',
    details: {
      inputSize: items.length,
      outputSize: result.length
    }
  };

  // Log performance info for development
  if (process.env.NODE_ENV === 'development') {
    logPerformanceInfo('SortOperation', `${operationName} completed`, {
      duration: `${duration.toFixed(2)}ms`,
      itemCount: items.length,
      throughput: `${(items.length / duration * 1000).toFixed(0)} items/sec`
    });
  }

  return { result, measurement };
};

/**
 * Measure filtering operations performance
 */
export const measureFilterOperation = async <T>(
  items: T[],
  filterFunction: (items: T[]) => T[],
  operationName: string = 'filter'
): Promise<{ result: T[]; measurement: OperationMeasurement }> => {
  const { result, duration } = await measureOperation(
    `${operationName}-${items.length}-items`,
    () => filterFunction(items)
  );

  const measurement: OperationMeasurement = {
    duration,
    itemCount: items.length,
    operationType: 'filter',
    details: {
      inputSize: items.length,
      outputSize: result.length,
      filterRatio: result.length / items.length
    }
  };

  // Log performance info for development
  if (process.env.NODE_ENV === 'development') {
    logPerformanceInfo('FilterOperation', `${operationName} completed`, {
      duration: `${duration.toFixed(2)}ms`,
      inputCount: items.length,
      outputCount: result.length,
      filterRatio: `${(result.length / items.length * 100).toFixed(1)}%`
    });
  }

  return { result, measurement };
};

/**
 * Measure note sorting specifically
 */
export const measureNoteSorting = async (
  notes: Note[],
  sortOption: SortOption
): Promise<{ result: Note[]; measurement: OperationMeasurement }> => {
  const sortFunction = (notesToSort: Note[]): Note[] => {
    return [...notesToSort].sort((a, b) => {
      if (sortOption.field === 'title') {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return sortOption.direction === 'asc'
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA);
      } else {
        const dateA = a[sortOption.field].getTime();
        const dateB = b[sortOption.field].getTime();
        return sortOption.direction === 'asc'
          ? dateA - dateB
          : dateB - dateA;
      }
    });
  };

  const { result, measurement } = await measureSortOperation(
    notes,
    sortFunction,
    `note-sort-${sortOption.field}-${sortOption.direction}`
  );

  // Add sort-specific details
  measurement.details = {
    ...measurement.details,
    sortField: sortOption.field,
    sortDirection: sortOption.direction,
    sortLabel: sortOption.label
  };

  return { result, measurement };
};

/**
 * Measure note filtering specifically
 */
export const measureNoteFiltering = async (
  notes: Note[],
  filterFunction: (notes: Note[]) => Note[],
  filterName: string = 'custom'
): Promise<{ result: Note[]; measurement: OperationMeasurement }> => {
  return measureFilterOperation(
    notes,
    filterFunction,
    `note-filter-${filterName}`
  );
};

/**
 * Measure note categorization (favorites vs others)
 */
export const measureNoteCategorization = async (
  notes: Note[]
): Promise<{
  favoriteNotes: Note[];
  otherNotes: Note[];
  measurement: OperationMeasurement;
}> => {
  const { result, duration } = await measureOperation(
    `note-categorization-${notes.length}-items`,
    () => {
      const favorites = notes.filter(note => note.favorite);
      const others = notes.filter(note => !note.favorite);
      return { favorites, others };
    }
  );

  const measurement: OperationMeasurement = {
    duration,
    itemCount: notes.length,
    operationType: 'categorization',
    details: {
      inputSize: notes.length,
      favoriteCount: result.favorites.length,
      otherCount: result.others.length,
      favoriteRatio: result.favorites.length / notes.length
    }
  };

  // Log performance info for development
  if (process.env.NODE_ENV === 'development') {
    logPerformanceInfo('NoteCategorization', 'Categorization completed', {
      duration: `${duration.toFixed(2)}ms`,
      totalNotes: notes.length,
      favorites: result.favorites.length,
      others: result.others.length
    });
  }

  return {
    favoriteNotes: result.favorites,
    otherNotes: result.others,
    measurement
  };
};

/**
 * Batch measurement for multiple operations
 */
export const measureBatchOperations = async <T>(
  operations: Array<{
    name: string;
    operation: () => T | Promise<T>;
  }>
): Promise<Array<{ name: string; result: T; measurement: OperationMeasurement }>> => {
  const results = [];

  for (const { name, operation } of operations) {
    const { result, duration } = await measureOperation(name, operation);
    
    const measurement: OperationMeasurement = {
      duration,
      itemCount: 0, // Will be set by specific operations if needed
      operationType: 'batch',
      details: { operationName: name }
    };

    results.push({ name, result, measurement });
  }

  // Log batch summary
  if (process.env.NODE_ENV === 'development') {
    const totalDuration = results.reduce((sum, r) => sum + r.measurement.duration, 0);
    logPerformanceInfo('BatchOperations', 'Batch completed', {
      operationCount: operations.length,
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      averageDuration: `${(totalDuration / operations.length).toFixed(2)}ms`
    });
  }

  return results;
};

/**
 * Performance threshold checker for operations
 */
export const checkOperationThresholds = (
  measurement: OperationMeasurement,
  thresholds: {
    maxDuration?: number;
    maxItemsPerMs?: number;
    warnDuration?: number;
  } = {}
): {
  isWithinThresholds: boolean;
  warnings: string[];
  recommendations: string[];
} => {
  const {
    maxDuration = 100, // 100ms max
    maxItemsPerMs = 10, // 10 items per ms minimum throughput
    warnDuration = 50   // 50ms warning threshold
  } = thresholds;

  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check duration thresholds
  if (measurement.duration > maxDuration) {
    warnings.push(`Operation exceeded maximum duration: ${measurement.duration.toFixed(2)}ms > ${maxDuration}ms`);
    recommendations.push('Consider optimizing the operation or implementing pagination');
  } else if (measurement.duration > warnDuration) {
    warnings.push(`Operation approaching slow threshold: ${measurement.duration.toFixed(2)}ms`);
    recommendations.push('Monitor this operation for potential optimization');
  }

  // Check throughput for operations with item counts
  if (measurement.itemCount > 0) {
    const throughput = measurement.itemCount / measurement.duration;
    if (throughput < maxItemsPerMs) {
      warnings.push(`Low throughput: ${throughput.toFixed(2)} items/ms < ${maxItemsPerMs} items/ms`);
      recommendations.push('Consider optimizing the algorithm or using memoization');
    }
  }

  return {
    isWithinThresholds: warnings.length === 0,
    warnings,
    recommendations
  };
};

/**
 * Create a performance measurement decorator for functions
 */
export const withPerformanceMeasurement = <T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T => {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    const result = fn(...args);
    const duration = performance.now() - startTime;

    if (process.env.NODE_ENV === 'development') {
      logPerformanceInfo('DecoratedFunction', `${operationName} completed`, {
        duration: `${duration.toFixed(2)}ms`,
        args: args.length
      });
    }

    return result;
  }) as T;
};