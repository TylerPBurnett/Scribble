/**
 * React hook for measuring expensive operations with automatic performance tracking
 * Provides convenient utilities for measuring sorting, filtering, and other operations
 */

import { useCallback, useRef } from 'react';
import { useOperationMeasurement } from './usePerformanceMonitoring';
import {
  measureSortOperation,
  measureFilterOperation,
  measureNoteSorting,
  measureNoteFiltering,
  measureNoteCategorization,
  checkOperationThresholds,
  type OperationMeasurement
} from '../utils/operationMeasurements';
import { logPerformanceWarning } from '../utils/performanceLogger';
import type { Note } from '../types/Note';
import type { SortOption } from '../services/settingsService';

interface ExpensiveOperationOptions {
  enabled?: boolean;
  warnThreshold?: number;
  maxThreshold?: number;
  logResults?: boolean;
}

/**
 * Hook for measuring expensive operations with automatic threshold checking
 */
export const useExpensiveOperations = (
  componentName: string,
  options: ExpensiveOperationOptions = {}
) => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    warnThreshold = 50,
    maxThreshold = 100,
    logResults = true
  } = options;

  const { measureOperation, measureSync } = useOperationMeasurement(enabled);
  const measurementHistory = useRef<Map<string, OperationMeasurement[]>>(new Map());

  // Store measurement in history
  const storeMeasurement = useCallback((operationName: string, measurement: OperationMeasurement) => {
    if (!enabled) return;

    const history = measurementHistory.current.get(operationName) || [];
    history.push(measurement);
    
    // Keep only last 10 measurements
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    
    measurementHistory.current.set(operationName, history);
  }, [enabled]);

  // Check thresholds and log warnings
  const checkAndLogThresholds = useCallback((
    operationName: string,
    measurement: OperationMeasurement
  ) => {
    if (!enabled) return;

    const thresholdCheck = checkOperationThresholds(measurement, {
      warnDuration: warnThreshold,
      maxDuration: maxThreshold
    });

    if (!thresholdCheck.isWithinThresholds) {
      thresholdCheck.warnings.forEach(warning => {
        logPerformanceWarning(componentName, `${operationName}: ${warning}`);
      });

      if (logResults) {
        console.group(`⚠️ Performance Warning: ${componentName} - ${operationName}`);
        thresholdCheck.warnings.forEach(warning => console.warn(warning));
        thresholdCheck.recommendations.forEach(rec => console.log(`💡 ${rec}`));
        console.groupEnd();
      }
    }
  }, [componentName, enabled, warnThreshold, maxThreshold, logResults]);

  // Measure sorting operations
  const measureSort = useCallback(async <T>(
    items: T[],
    sortFunction: (items: T[]) => T[],
    operationName: string = 'sort'
  ) => {
    if (!enabled) {
      return { result: sortFunction(items), measurement: null };
    }

    const { result, measurement } = await measureSortOperation(items, sortFunction, operationName);
    
    storeMeasurement(operationName, measurement);
    checkAndLogThresholds(operationName, measurement);

    return { result, measurement };
  }, [enabled, storeMeasurement, checkAndLogThresholds]);

  // Measure filtering operations
  const measureFilter = useCallback(async <T>(
    items: T[],
    filterFunction: (items: T[]) => T[],
    operationName: string = 'filter'
  ) => {
    if (!enabled) {
      return { result: filterFunction(items), measurement: null };
    }

    const { result, measurement } = await measureFilterOperation(items, filterFunction, operationName);
    
    storeMeasurement(operationName, measurement);
    checkAndLogThresholds(operationName, measurement);

    return { result, measurement };
  }, [enabled, storeMeasurement, checkAndLogThresholds]);

  // Measure note sorting specifically
  const measureNoteSort = useCallback(async (
    notes: Note[],
    sortOption: SortOption
  ) => {
    if (!enabled) {
      // Fallback sorting without measurement
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
      return { result: sortFunction(notes), measurement: null };
    }

    const operationName = `note-sort-${sortOption.field}-${sortOption.direction}`;
    const { result, measurement } = await measureNoteSorting(notes, sortOption);
    
    storeMeasurement(operationName, measurement);
    checkAndLogThresholds(operationName, measurement);

    return { result, measurement };
  }, [enabled, storeMeasurement, checkAndLogThresholds]);

  // Measure note filtering specifically
  const measureNoteFilter = useCallback(async (
    notes: Note[],
    filterFunction: (notes: Note[]) => Note[],
    filterName: string = 'custom'
  ) => {
    if (!enabled) {
      return { result: filterFunction(notes), measurement: null };
    }

    const { result, measurement } = await measureNoteFiltering(notes, filterFunction, filterName);
    
    storeMeasurement(filterName, measurement);
    checkAndLogThresholds(filterName, measurement);

    return { result, measurement };
  }, [enabled, storeMeasurement, checkAndLogThresholds]);

  // Measure note categorization
  const measureNoteCategorize = useCallback(async (notes: Note[]) => {
    if (!enabled) {
      // Fallback categorization without measurement
      const favorites = notes.filter(note => note.favorite);
      const others = notes.filter(note => !note.favorite);
      return { favoriteNotes: favorites, otherNotes: others, measurement: null };
    }

    const { favoriteNotes, otherNotes, measurement } = await measureNoteCategorization(notes);
    
    storeMeasurement('note-categorization', measurement);
    checkAndLogThresholds('note-categorization', measurement);

    return { favoriteNotes, otherNotes, measurement };
  }, [enabled, storeMeasurement, checkAndLogThresholds]);

  // Get measurement history for an operation
  const getMeasurementHistory = useCallback((operationName: string) => {
    return measurementHistory.current.get(operationName) || [];
  }, []);

  // Get average performance for an operation
  const getAveragePerformance = useCallback((operationName: string) => {
    const history = getMeasurementHistory(operationName);
    if (history.length === 0) return null;

    const totalDuration = history.reduce((sum, m) => sum + m.duration, 0);
    const totalItems = history.reduce((sum, m) => sum + m.itemCount, 0);

    return {
      averageDuration: totalDuration / history.length,
      averageItemCount: totalItems / history.length,
      measurementCount: history.length,
      totalDuration,
      totalItems
    };
  }, [getMeasurementHistory]);

  // Clear measurement history
  const clearHistory = useCallback((operationName?: string) => {
    if (operationName) {
      measurementHistory.current.delete(operationName);
    } else {
      measurementHistory.current.clear();
    }
  }, []);

  return {
    // Core measurement functions
    measureSort,
    measureFilter,
    measureNoteSort,
    measureNoteFilter,
    measureNoteCategorize,
    
    // Generic measurement functions
    measureOperation,
    measureSync,
    
    // History and analytics
    getMeasurementHistory,
    getAveragePerformance,
    clearHistory,
    
    // Configuration
    enabled,
    thresholds: {
      warn: warnThreshold,
      max: maxThreshold
    }
  };
};

/**
 * Hook specifically for NoteList performance measurements
 */
export const useNoteListPerformance = (componentName: string = 'NoteList') => {
  const operations = useExpensiveOperations(componentName, {
    warnThreshold: 16, // Target 60fps
    maxThreshold: 50,  // Maximum acceptable delay
    logResults: true
  });

  // Convenience wrapper for common NoteList operations
  const measureNoteListOperations = useCallback(async (
    notes: Note[],
    sortOption: SortOption,
    deletedNotes: string[] = []
  ) => {
    // Measure filtering (removing deleted notes)
    const { result: filteredNotes } = await operations.measureNoteFilter(
      notes,
      (notes) => notes.filter(note => !deletedNotes.includes(note.id)),
      'deleted-filter'
    );

    // Measure sorting
    const { result: sortedNotes } = await operations.measureNoteSort(filteredNotes, sortOption);

    // Measure categorization
    const { favoriteNotes, otherNotes } = await operations.measureNoteCategorize(sortedNotes);

    return {
      filteredNotes,
      sortedNotes,
      favoriteNotes,
      otherNotes
    };
  }, [operations]);

  return {
    ...operations,
    measureNoteListOperations
  };
};

/**
 * Hook for measuring NoteEditor performance
 */
export const useNoteEditorPerformance = (componentName: string = 'NoteEditor') => {
  return useExpensiveOperations(componentName, {
    warnThreshold: 16, // Target smooth typing
    maxThreshold: 32,  // Maximum acceptable input lag
    logResults: true
  });
};

/**
 * Hook for measuring NoteCard performance
 */
export const useNoteCardPerformance = (componentName: string = 'NoteCard') => {
  return useExpensiveOperations(componentName, {
    warnThreshold: 8,  // Very fast for individual cards
    maxThreshold: 16,  // Maximum for smooth interactions
    logResults: true
  });
};