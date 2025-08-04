/**
 * Performance comparison utilities for measuring optimization effectiveness
 * Provides tools for comparing before/after performance metrics
 */

import {
  getComponentMetrics,
  resetComponentMetrics,
  type PerformanceMetrics
} from './performanceUtils';
import { logOptimizationResult } from './performanceLogger';
import type { OperationMeasurement } from './operationMeasurements';

export interface PerformanceSnapshot {
  timestamp: string;
  componentName: string;
  metrics: PerformanceMetrics | null;
  operationMeasurements: Map<string, OperationMeasurement[]>;
  customData?: Record<string, any>;
}

export interface ComparisonResult {
  componentName: string;
  before: PerformanceSnapshot;
  after: PerformanceSnapshot;
  improvement: {
    renderTimeReduction: number;
    renderCountReduction: number;
    memoizationImprovement: number;
    operationImprovements: Map<string, {
      averageDurationReduction: number;
      consistencyImprovement: number;
    }>;
  };
  summary: {
    overallImprovement: number;
    significantImprovements: string[];
    regressions: string[];
    recommendations: string[];
  };
}

class PerformanceComparator {
  private snapshots: Map<string, PerformanceSnapshot[]> = new Map();
  private maxSnapshots: number = 10;

  // Take a performance snapshot
  takeSnapshot(
    componentName: string,
    operationMeasurements: Map<string, OperationMeasurement[]> = new Map(),
    customData?: Record<string, any>
  ): PerformanceSnapshot {
    const metrics = getComponentMetrics(componentName) || null;
    
    const snapshot: PerformanceSnapshot = {
      timestamp: new Date().toISOString(),
      componentName,
      metrics,
      operationMeasurements: new Map(operationMeasurements),
      customData
    };

    // Store snapshot
    const componentSnapshots = this.snapshots.get(componentName) || [];
    componentSnapshots.push(snapshot);
    
    // Keep only recent snapshots
    if (componentSnapshots.length > this.maxSnapshots) {
      componentSnapshots.splice(0, componentSnapshots.length - this.maxSnapshots);
    }
    
    this.snapshots.set(componentName, componentSnapshots);

    return snapshot;
  }

  // Get the latest snapshot for a component
  getLatestSnapshot(componentName: string): PerformanceSnapshot | null {
    const snapshots = this.snapshots.get(componentName);
    return snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }

  // Get all snapshots for a component
  getSnapshots(componentName: string): PerformanceSnapshot[] {
    return this.snapshots.get(componentName) || [];
  }

  // Compare two snapshots
  compareSnapshots(before: PerformanceSnapshot, after: PerformanceSnapshot): ComparisonResult {
    const componentName = before.componentName;
    
    // Calculate render performance improvements
    const renderTimeReduction = before.metrics && after.metrics
      ? before.metrics.averageRenderTime - after.metrics.averageRenderTime
      : 0;
    
    const renderCountReduction = before.metrics && after.metrics
      ? before.metrics.renderCount - after.metrics.renderCount
      : 0;
    
    const memoizationImprovement = before.metrics && after.metrics
      ? after.metrics.memoizationHitRate - before.metrics.memoizationHitRate
      : 0;

    // Calculate operation improvements
    const operationImprovements = new Map<string, {
      averageDurationReduction: number;
      consistencyImprovement: number;
    }>();

    // Compare operation measurements
    for (const [operationName, beforeMeasurements] of before.operationMeasurements) {
      const afterMeasurements = after.operationMeasurements.get(operationName);
      
      if (afterMeasurements && beforeMeasurements.length > 0 && afterMeasurements.length > 0) {
        const beforeAvg = beforeMeasurements.reduce((sum, m) => sum + m.duration, 0) / beforeMeasurements.length;
        const afterAvg = afterMeasurements.reduce((sum, m) => sum + m.duration, 0) / afterMeasurements.length;
        
        const beforeVariance = this.calculateVariance(beforeMeasurements.map(m => m.duration));
        const afterVariance = this.calculateVariance(afterMeasurements.map(m => m.duration));
        
        operationImprovements.set(operationName, {
          averageDurationReduction: beforeAvg - afterAvg,
          consistencyImprovement: beforeVariance - afterVariance
        });
      }
    }

    // Generate summary
    const significantImprovements: string[] = [];
    const regressions: string[] = [];
    const recommendations: string[] = [];

    // Check render time improvements
    if (renderTimeReduction > 1) {
      significantImprovements.push(`Render time improved by ${renderTimeReduction.toFixed(2)}ms`);
    } else if (renderTimeReduction < -1) {
      regressions.push(`Render time regressed by ${Math.abs(renderTimeReduction).toFixed(2)}ms`);
    }

    // Check memoization improvements
    if (memoizationImprovement > 0.1) {
      significantImprovements.push(`Memoization hit rate improved by ${(memoizationImprovement * 100).toFixed(1)}%`);
    } else if (memoizationImprovement < -0.1) {
      regressions.push(`Memoization hit rate decreased by ${Math.abs(memoizationImprovement * 100).toFixed(1)}%`);
    }

    // Check operation improvements
    for (const [operationName, improvement] of operationImprovements) {
      if (improvement.averageDurationReduction > 1) {
        significantImprovements.push(`${operationName} operation improved by ${improvement.averageDurationReduction.toFixed(2)}ms`);
      } else if (improvement.averageDurationReduction < -1) {
        regressions.push(`${operationName} operation regressed by ${Math.abs(improvement.averageDurationReduction).toFixed(2)}ms`);
      }
    }

    // Generate recommendations
    if (after.metrics) {
      if (after.metrics.averageRenderTime > 16) {
        recommendations.push('Render time still exceeds 16ms target - consider additional optimizations');
      }
      
      if (after.metrics.memoizationHitRate < 0.5) {
        recommendations.push('Memoization hit rate is low - review dependency arrays');
      }
    }

    // Calculate overall improvement score
    let overallImprovement = 0;
    if (renderTimeReduction > 0) overallImprovement += renderTimeReduction / 10; // Weight render time highly
    if (memoizationImprovement > 0) overallImprovement += memoizationImprovement * 50; // Weight memoization
    
    for (const improvement of operationImprovements.values()) {
      if (improvement.averageDurationReduction > 0) {
        overallImprovement += improvement.averageDurationReduction / 5;
      }
    }

    return {
      componentName,
      before,
      after,
      improvement: {
        renderTimeReduction,
        renderCountReduction,
        memoizationImprovement,
        operationImprovements
      },
      summary: {
        overallImprovement,
        significantImprovements,
        regressions,
        recommendations
      }
    };
  }

  // Compare latest snapshot with previous one
  compareWithPrevious(componentName: string): ComparisonResult | null {
    const snapshots = this.getSnapshots(componentName);
    if (snapshots.length < 2) return null;

    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[snapshots.length - 2];

    return this.compareSnapshots(previous, latest);
  }

  // Calculate variance for consistency measurements
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Clear snapshots for a component
  clearSnapshots(componentName: string): void {
    this.snapshots.delete(componentName);
  }

  // Clear all snapshots
  clearAllSnapshots(): void {
    this.snapshots.clear();
  }

  // Export comparison data
  exportComparisonData(): string {
    const data = {
      timestamp: new Date().toISOString(),
      snapshots: Object.fromEntries(this.snapshots)
    };
    return JSON.stringify(data, null, 2);
  }
}

// Global comparator instance
const performanceComparator = new PerformanceComparator();

// Exported utility functions
export const takePerformanceSnapshot = (
  componentName: string,
  operationMeasurements?: Map<string, OperationMeasurement[]>,
  customData?: Record<string, any>
): PerformanceSnapshot => {
  return performanceComparator.takeSnapshot(componentName, operationMeasurements, customData);
};

export const getLatestPerformanceSnapshot = (componentName: string): PerformanceSnapshot | null => {
  return performanceComparator.getLatestSnapshot(componentName);
};

export const getAllPerformanceSnapshots = (componentName: string): PerformanceSnapshot[] => {
  return performanceComparator.getSnapshots(componentName);
};

export const comparePerformanceSnapshots = (
  before: PerformanceSnapshot,
  after: PerformanceSnapshot
): ComparisonResult => {
  return performanceComparator.compareSnapshots(before, after);
};

export const compareWithPreviousSnapshot = (componentName: string): ComparisonResult | null => {
  return performanceComparator.compareWithPrevious(componentName);
};

export const clearPerformanceSnapshots = (componentName?: string): void => {
  if (componentName) {
    performanceComparator.clearSnapshots(componentName);
  } else {
    performanceComparator.clearAllSnapshots();
  }
};

export const exportPerformanceComparisons = (): string => {
  return performanceComparator.exportComparisonData();
};

// Utility for measuring optimization impact
export const measureOptimizationImpact = async <T>(
  componentName: string,
  beforeOperation: () => T | Promise<T>,
  afterOperation: () => T | Promise<T>,
  operationMeasurements?: Map<string, OperationMeasurement[]>
): Promise<{
  beforeResult: T;
  afterResult: T;
  comparison: ComparisonResult;
}> => {
  // Reset metrics to get clean measurements
  resetComponentMetrics(componentName);
  
  // Take before snapshot and run operation
  const beforeSnapshot = takePerformanceSnapshot(componentName, operationMeasurements, { phase: 'before' });
  const beforeResult = await beforeOperation();
  
  // Reset and take after snapshot
  resetComponentMetrics(componentName);
  const afterSnapshot = takePerformanceSnapshot(componentName, operationMeasurements, { phase: 'after' });
  const afterResult = await afterOperation();
  
  // Compare results
  const comparison = comparePerformanceSnapshots(beforeSnapshot, afterSnapshot);
  
  // Log results
  if (process.env.NODE_ENV === 'development') {
    logOptimizationResult({
      before: beforeSnapshot.metrics || {
        componentName,
        renderCount: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        memoizationHitRate: 0,
        totalTime: 0,
        measurements: []
      },
      after: afterSnapshot.metrics || {
        componentName,
        renderCount: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        memoizationHitRate: 0,
        totalTime: 0,
        measurements: []
      },
      improvement: {
        renderTimeReduction: comparison.improvement.renderTimeReduction,
        renderCountReduction: comparison.improvement.renderCountReduction,
        memoryUsageChange: 0 // Placeholder
      }
    });
  }
  
  return {
    beforeResult,
    afterResult,
    comparison
  };
};

// Console utilities for development
export const printComparisonResult = (comparison: ComparisonResult): void => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group(`🔍 Performance Comparison: ${comparison.componentName}`);
  
  console.group('📊 Improvements');
  if (comparison.summary.significantImprovements.length > 0) {
    comparison.summary.significantImprovements.forEach(improvement => {
      console.log(`✅ ${improvement}`);
    });
  } else {
    console.log('No significant improvements detected');
  }
  console.groupEnd();

  if (comparison.summary.regressions.length > 0) {
    console.group('⚠️ Regressions');
    comparison.summary.regressions.forEach(regression => {
      console.warn(`❌ ${regression}`);
    });
    console.groupEnd();
  }

  if (comparison.summary.recommendations.length > 0) {
    console.group('💡 Recommendations');
    comparison.summary.recommendations.forEach(rec => {
      console.log(`• ${rec}`);
    });
    console.groupEnd();
  }

  console.log(`Overall Improvement Score: ${comparison.summary.overallImprovement.toFixed(2)}`);
  console.groupEnd();
};

// Export the comparator instance for advanced usage
export { performanceComparator };