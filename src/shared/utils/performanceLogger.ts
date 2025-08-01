/**
 * Performance logging utilities for structured performance data collection
 * Provides formatted logging, reporting, and data export capabilities
 */

import {
  getAllPerformanceMetrics,
  getPerformanceSummary,
  type PerformanceMetrics,
  type OptimizationResult
} from './performanceUtils';

export interface PerformanceReport {
  timestamp: string;
  summary: ReturnType<typeof getPerformanceSummary>;
  componentMetrics: PerformanceMetrics[];
  recommendations: string[];
}

export interface PerformanceLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  componentName: string;
  message: string;
  data?: any;
}

class PerformanceLogger {
  private logs: PerformanceLogEntry[] = [];
  private maxLogs: number = 1000;

  // Add a log entry
  private addLog(level: PerformanceLogEntry['level'], componentName: string, message: string, data?: any): void {
    const entry: PerformanceLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      componentName,
      message,
      data
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      consoleMethod(`[Performance] ${componentName}: ${message}`, data || '');
    }
  }

  // Log performance info
  info(componentName: string, message: string, data?: any): void {
    this.addLog('info', componentName, message, data);
  }

  // Log performance warning
  warn(componentName: string, message: string, data?: any): void {
    this.addLog('warn', componentName, message, data);
  }

  // Log performance error
  error(componentName: string, message: string, data?: any): void {
    this.addLog('error', componentName, message, data);
  }

  // Get all logs
  getLogs(): PerformanceLogEntry[] {
    return [...this.logs];
  }

  // Get logs for a specific component
  getComponentLogs(componentName: string): PerformanceLogEntry[] {
    return this.logs.filter(log => log.componentName === componentName);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Generate performance report
  generateReport(): PerformanceReport {
    const summary = getPerformanceSummary();
    const allMetrics = Array.from(getAllPerformanceMetrics().values());
    const recommendations = this.generateRecommendations(allMetrics);

    return {
      timestamp: new Date().toISOString(),
      summary,
      componentMetrics: allMetrics,
      recommendations
    };
  }

  // Generate performance recommendations
  private generateRecommendations(metrics: PerformanceMetrics[]): string[] {
    const recommendations: string[] = [];

    metrics.forEach(metric => {
      // Slow render time recommendation
      if (metric.averageRenderTime > 16) {
        recommendations.push(
          `${metric.componentName}: Average render time (${metric.averageRenderTime.toFixed(2)}ms) exceeds 16ms. Consider memoization or state optimization.`
        );
      }

      // High render count recommendation
      if (metric.renderCount > 100) {
        recommendations.push(
          `${metric.componentName}: High render count (${metric.renderCount}). Check for unnecessary re-renders.`
        );
      }

      // Low memoization hit rate recommendation
      if (metric.memoizationHitRate < 0.5 && metric.renderCount > 10) {
        recommendations.push(
          `${metric.componentName}: Low memoization hit rate (${(metric.memoizationHitRate * 100).toFixed(1)}%). Review memoization dependencies.`
        );
      }

      // Inconsistent render times
      if (metric.measurements.length > 5) {
        const variance = this.calculateVariance(metric.measurements);
        const standardDeviation = Math.sqrt(variance);
        if (standardDeviation > metric.averageRenderTime * 0.5) {
          recommendations.push(
            `${metric.componentName}: Inconsistent render times (σ=${standardDeviation.toFixed(2)}ms). Investigate performance bottlenecks.`
          );
        }
      }
    });

    // Overall recommendations
    const summary = getPerformanceSummary();
    if (summary.totalComponents > 0) {
      const slowComponents = metrics.filter(m => m.averageRenderTime > 16);
      if (slowComponents.length > 0) {
        recommendations.push(
          `${slowComponents.length} components have slow render times. Priority optimization targets: ${slowComponents.map(c => c.componentName).join(', ')}`
        );
      }
    }

    return recommendations;
  }

  // Calculate variance for render time consistency
  private calculateVariance(measurements: number[]): number {
    if (measurements.length < 2) return 0;
    
    const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const squaredDifferences = measurements.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, val) => sum + val, 0) / measurements.length;
  }

  // Export performance data as JSON
  exportData(): string {
    const report = this.generateReport();
    const exportData = {
      report,
      logs: this.logs
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Log optimization results
  logOptimizationResult(result: OptimizationResult): void {
    const { before, after, improvement } = result;
    const componentName = before.componentName;

    this.info(componentName, 'Optimization completed', {
      before: {
        renderCount: before.renderCount,
        averageRenderTime: before.averageRenderTime,
        memoizationHitRate: before.memoizationHitRate
      },
      after: {
        renderCount: after.renderCount,
        averageRenderTime: after.averageRenderTime,
        memoizationHitRate: after.memoizationHitRate
      },
      improvement
    });

    // Log specific improvements
    if (improvement.renderTimeReduction > 0) {
      this.info(componentName, `Render time improved by ${improvement.renderTimeReduction.toFixed(2)}ms`);
    }

    if (improvement.renderCountReduction > 0) {
      this.info(componentName, `Render count reduced by ${improvement.renderCountReduction}`);
    }

    // Log warnings for regressions
    if (improvement.renderTimeReduction < 0) {
      this.warn(componentName, `Render time regression: ${Math.abs(improvement.renderTimeReduction).toFixed(2)}ms slower`);
    }

    if (improvement.renderCountReduction < 0) {
      this.warn(componentName, `Render count regression: ${Math.abs(improvement.renderCountReduction)} more renders`);
    }
  }

  // Log baseline measurements
  logBaseline(componentName: string, metrics: PerformanceMetrics): void {
    this.info(componentName, 'Baseline measurement completed', {
      renderCount: metrics.renderCount,
      averageRenderTime: metrics.averageRenderTime,
      totalTime: metrics.totalTime
    });
  }

  // Log performance threshold violations
  checkThresholds(componentName: string, metrics: PerformanceMetrics): void {
    const thresholds = {
      maxRenderTime: 16, // 60fps target
      maxRenderCount: 50, // Reasonable render count
      minMemoizationRate: 0.3 // Minimum memoization effectiveness
    };

    if (metrics.averageRenderTime > thresholds.maxRenderTime) {
      this.warn(componentName, `Render time threshold exceeded: ${metrics.averageRenderTime.toFixed(2)}ms > ${thresholds.maxRenderTime}ms`);
    }

    if (metrics.renderCount > thresholds.maxRenderCount) {
      this.warn(componentName, `Render count threshold exceeded: ${metrics.renderCount} > ${thresholds.maxRenderCount}`);
    }

    if (metrics.memoizationHitRate < thresholds.minMemoizationRate && metrics.renderCount > 5) {
      this.warn(componentName, `Low memoization hit rate: ${(metrics.memoizationHitRate * 100).toFixed(1)}% < ${thresholds.minMemoizationRate * 100}%`);
    }
  }
}

// Global logger instance
const performanceLogger = new PerformanceLogger();

// Exported utility functions
export const logPerformanceInfo = (componentName: string, message: string, data?: any): void => {
  performanceLogger.info(componentName, message, data);
};

export const logPerformanceWarning = (componentName: string, message: string, data?: any): void => {
  performanceLogger.warn(componentName, message, data);
};

export const logPerformanceError = (componentName: string, message: string, data?: any): void => {
  performanceLogger.error(componentName, message, data);
};

export const generatePerformanceReport = (): PerformanceReport => {
  return performanceLogger.generateReport();
};

export const exportPerformanceData = (): string => {
  return performanceLogger.exportData();
};

export const logOptimizationResult = (result: OptimizationResult): void => {
  performanceLogger.logOptimizationResult(result);
};

export const logBaselineMeasurement = (componentName: string, metrics: PerformanceMetrics): void => {
  performanceLogger.logBaseline(componentName, metrics);
};

export const checkPerformanceThresholds = (componentName: string, metrics: PerformanceMetrics): void => {
  performanceLogger.checkThresholds(componentName, metrics);
};

export const getPerformanceLogs = (): PerformanceLogEntry[] => {
  return performanceLogger.getLogs();
};

export const getComponentPerformanceLogs = (componentName: string): PerformanceLogEntry[] => {
  return performanceLogger.getComponentLogs(componentName);
};

export const clearPerformanceLogs = (): void => {
  performanceLogger.clearLogs();
};

// Console utilities for development
export const printPerformanceReport = (): void => {
  if (process.env.NODE_ENV !== 'development') return;

  const report = generatePerformanceReport();
  
  console.group('🚀 Performance Report');
  console.log('Generated:', report.timestamp);
  
  console.group('📊 Summary');
  console.log(`Total Components: ${report.summary.totalComponents}`);
  console.log(`Total Renders: ${report.summary.totalRenders}`);
  console.log(`Average Render Time: ${report.summary.averageRenderTime.toFixed(2)}ms`);
  console.log(`Slowest Component: ${report.summary.slowestComponent || 'N/A'}`);
  console.log(`Fastest Component: ${report.summary.fastestComponent || 'N/A'}`);
  console.groupEnd();

  if (report.componentMetrics.length > 0) {
    console.group('📈 Component Metrics');
    report.componentMetrics.forEach(metric => {
      console.log(`${metric.componentName}:`, {
        renders: metric.renderCount,
        avgTime: `${metric.averageRenderTime.toFixed(2)}ms`,
        memoHitRate: `${(metric.memoizationHitRate * 100).toFixed(1)}%`
      });
    });
    console.groupEnd();
  }

  if (report.recommendations.length > 0) {
    console.group('💡 Recommendations');
    report.recommendations.forEach(rec => console.log(`• ${rec}`));
    console.groupEnd();
  }

  console.groupEnd();
};

// Export the logger instance for advanced usage
export { performanceLogger };