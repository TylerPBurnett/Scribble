/**
 * Performance measurement utilities for React component optimization
 * Provides tools for measuring render times, counts, and performance comparisons
 */

// Performance metrics interface
export interface PerformanceMetrics {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  memoizationHitRate: number;
  totalTime: number;
  measurements: number[];
}

export interface OptimizationResult {
  before: PerformanceMetrics;
  after: PerformanceMetrics;
  improvement: {
    renderTimeReduction: number;
    renderCountReduction: number;
    memoryUsageChange: number;
  };
}

// Global performance tracking store
class PerformanceTracker {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private renderStartTimes: Map<string, number> = new Map();
  private memoizationStats: Map<string, { hits: number; misses: number }> = new Map();

  // Initialize metrics for a component
  initializeComponent(componentName: string): void {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, {
        componentName,
        renderCount: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        memoizationHitRate: 0,
        totalTime: 0,
        measurements: []
      });
    }

    if (!this.memoizationStats.has(componentName)) {
      this.memoizationStats.set(componentName, { hits: 0, misses: 0 });
    }
  }

  // Start measuring render time
  startRender(componentName: string): void {
    this.initializeComponent(componentName);
    this.renderStartTimes.set(componentName, performance.now());
  }

  // End measuring render time and update metrics
  endRender(componentName: string): number {
    const startTime = this.renderStartTimes.get(componentName);
    if (!startTime) {
      console.warn(`No start time found for component: ${componentName}`);
      return 0;
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    const metrics = this.metrics.get(componentName)!;
    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    metrics.totalTime += renderTime;
    metrics.measurements.push(renderTime);
    
    // Keep only last 100 measurements to prevent memory leaks
    if (metrics.measurements.length > 100) {
      metrics.measurements = metrics.measurements.slice(-100);
    }
    
    metrics.averageRenderTime = metrics.totalTime / metrics.renderCount;

    // Update memoization hit rate
    const memoStats = this.memoizationStats.get(componentName)!;
    const totalMemoChecks = memoStats.hits + memoStats.misses;
    metrics.memoizationHitRate = totalMemoChecks > 0 ? memoStats.hits / totalMemoChecks : 0;

    this.renderStartTimes.delete(componentName);
    return renderTime;
  }

  // Record memoization hit
  recordMemoizationHit(componentName: string): void {
    this.initializeComponent(componentName);
    const stats = this.memoizationStats.get(componentName)!;
    stats.hits++;
  }

  // Record memoization miss
  recordMemoizationMiss(componentName: string): void {
    this.initializeComponent(componentName);
    const stats = this.memoizationStats.get(componentName)!;
    stats.misses++;
  }

  // Get metrics for a component
  getMetrics(componentName: string): PerformanceMetrics | undefined {
    const metrics = this.metrics.get(componentName);
    if (!metrics) return undefined;

    // Update memoization hit rate on demand
    const memoStats = this.memoizationStats.get(componentName);
    if (memoStats) {
      const totalMemoChecks = memoStats.hits + memoStats.misses;
      metrics.memoizationHitRate = totalMemoChecks > 0 ? memoStats.hits / totalMemoChecks : 0;
    }

    return metrics;
  }

  // Get all metrics
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  // Reset metrics for a component
  resetMetrics(componentName: string): void {
    this.metrics.delete(componentName);
    this.memoizationStats.delete(componentName);
    this.renderStartTimes.delete(componentName);
  }

  // Reset all metrics
  resetAllMetrics(): void {
    this.metrics.clear();
    this.memoizationStats.clear();
    this.renderStartTimes.clear();
  }

  // Get performance summary
  getPerformanceSummary(): {
    totalComponents: number;
    totalRenders: number;
    averageRenderTime: number;
    slowestComponent: string | null;
    fastestComponent: string | null;
  } {
    const allMetrics = Array.from(this.metrics.values());
    
    if (allMetrics.length === 0) {
      return {
        totalComponents: 0,
        totalRenders: 0,
        averageRenderTime: 0,
        slowestComponent: null,
        fastestComponent: null
      };
    }

    const totalRenders = allMetrics.reduce((sum, m) => sum + m.renderCount, 0);
    const totalTime = allMetrics.reduce((sum, m) => sum + m.totalTime, 0);
    const averageRenderTime = totalTime / totalRenders;

    const slowest = allMetrics.reduce((prev, current) => 
      prev.averageRenderTime > current.averageRenderTime ? prev : current
    );

    const fastest = allMetrics.reduce((prev, current) => 
      prev.averageRenderTime < current.averageRenderTime ? prev : current
    );

    return {
      totalComponents: allMetrics.length,
      totalRenders,
      averageRenderTime,
      slowestComponent: slowest.componentName,
      fastestComponent: fastest.componentName
    };
  }
}

// Global instance
const performanceTracker = new PerformanceTracker();

// Exported utility functions
export const startRenderMeasurement = (componentName: string): void => {
  if (process.env.NODE_ENV === 'development') {
    performanceTracker.startRender(componentName);
  }
};

export const endRenderMeasurement = (componentName: string): number => {
  if (process.env.NODE_ENV === 'development') {
    return performanceTracker.endRender(componentName);
  }
  return 0;
};

export const recordMemoizationHit = (componentName: string): void => {
  if (process.env.NODE_ENV === 'development') {
    performanceTracker.recordMemoizationHit(componentName);
  }
};

export const recordMemoizationMiss = (componentName: string): void => {
  if (process.env.NODE_ENV === 'development') {
    performanceTracker.recordMemoizationMiss(componentName);
  }
};

export const getComponentMetrics = (componentName: string): PerformanceMetrics | undefined => {
  return performanceTracker.getMetrics(componentName);
};

export const getAllPerformanceMetrics = (): Map<string, PerformanceMetrics> => {
  return performanceTracker.getAllMetrics();
};

export const resetComponentMetrics = (componentName: string): void => {
  performanceTracker.resetMetrics(componentName);
};

export const resetAllPerformanceMetrics = (): void => {
  performanceTracker.resetAllMetrics();
};

export const getPerformanceSummary = () => {
  return performanceTracker.getPerformanceSummary();
};

// Performance comparison utilities
export const comparePerformance = (
  beforeMetrics: PerformanceMetrics,
  afterMetrics: PerformanceMetrics
): OptimizationResult => {
  const renderTimeReduction = beforeMetrics.averageRenderTime - afterMetrics.averageRenderTime;
  const renderCountReduction = beforeMetrics.renderCount - afterMetrics.renderCount;
  
  // Memory usage change calculation (simplified - would need more sophisticated tracking in real implementation)
  const memoryUsageChange = 0; // Placeholder for now

  return {
    before: beforeMetrics,
    after: afterMetrics,
    improvement: {
      renderTimeReduction,
      renderCountReduction,
      memoryUsageChange
    }
  };
};

// Utility to measure expensive operations
export const measureOperation = async <T>(
  operationName: string,
  operation: () => T | Promise<T>
): Promise<{ result: T; duration: number }> => {
  const startTime = performance.now();
  const result = await operation();
  const duration = performance.now() - startTime;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Operation "${operationName}" took ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
};

// Baseline performance measurement for components
export const measureBaseline = (componentName: string, iterations: number = 10): Promise<PerformanceMetrics> => {
  return new Promise((resolve) => {
    performanceTracker.resetMetrics(componentName);
    
    let currentIteration = 0;
    
    const runIteration = () => {
      if (currentIteration >= iterations) {
        const metrics = performanceTracker.getMetrics(componentName);
        resolve(metrics!);
        return;
      }
      
      performanceTracker.startRender(componentName);
      
      // Simulate render work
      requestAnimationFrame(() => {
        performanceTracker.endRender(componentName);
        currentIteration++;
        runIteration();
      });
    };
    
    runIteration();
  });
};

// Performance logging utilities
export const logPerformanceMetrics = (componentName?: string): void => {
  if (process.env.NODE_ENV !== 'development') return;
  
  if (componentName) {
    const metrics = performanceTracker.getMetrics(componentName);
    if (metrics) {
      console.group(`Performance Metrics: ${componentName}`);
      console.log(`Render Count: ${metrics.renderCount}`);
      console.log(`Average Render Time: ${metrics.averageRenderTime.toFixed(2)}ms`);
      console.log(`Last Render Time: ${metrics.lastRenderTime.toFixed(2)}ms`);
      console.log(`Memoization Hit Rate: ${(metrics.memoizationHitRate * 100).toFixed(1)}%`);
      console.log(`Total Time: ${metrics.totalTime.toFixed(2)}ms`);
      console.groupEnd();
    }
  } else {
    const summary = performanceTracker.getPerformanceSummary();
    console.group('Performance Summary');
    console.log(`Total Components: ${summary.totalComponents}`);
    console.log(`Total Renders: ${summary.totalRenders}`);
    console.log(`Average Render Time: ${summary.averageRenderTime.toFixed(2)}ms`);
    console.log(`Slowest Component: ${summary.slowestComponent}`);
    console.log(`Fastest Component: ${summary.fastestComponent}`);
    console.groupEnd();
  }
};

// Export the tracker instance for advanced usage
export { performanceTracker };