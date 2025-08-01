/**
 * Example usage of performance utilities
 * This file demonstrates how to use the performance measurement infrastructure
 */

import {
  startRenderMeasurement,
  endRenderMeasurement,
  recordMemoizationHit,
  recordMemoizationMiss,
  getComponentMetrics,
  getAllPerformanceMetrics,
  getPerformanceSummary,
  measureOperation,
  logPerformanceMetrics
} from './performanceUtils';

import {
  logPerformanceInfo,
  logPerformanceWarning,
  generatePerformanceReport,
  printPerformanceReport
} from './performanceLogger';

// Example: Measuring component render performance
export const exampleComponentMeasurement = () => {
  console.log('🚀 Example: Component Render Measurement');
  
  // Simulate component renders
  for (let i = 0; i < 5; i++) {
    startRenderMeasurement('ExampleComponent');
    
    // Simulate render work (random delay between 5-25ms)
    const renderTime = Math.random() * 20 + 5;
    const startTime = performance.now();
    while (performance.now() - startTime < renderTime) {
      // Busy wait to simulate work
    }
    
    endRenderMeasurement('ExampleComponent');
    
    // Simulate memoization checks
    if (Math.random() > 0.3) {
      recordMemoizationHit('ExampleComponent');
    } else {
      recordMemoizationMiss('ExampleComponent');
    }
  }
  
  // Log the results
  const metrics = getComponentMetrics('ExampleComponent');
  console.log('Component Metrics:', metrics);
  
  logPerformanceMetrics('ExampleComponent');
};

// Example: Measuring expensive operations
export const exampleOperationMeasurement = async () => {
  console.log('🚀 Example: Operation Measurement');
  
  // Measure a synchronous operation
  const { result: syncResult, duration: syncDuration } = await measureOperation(
    'Array Sorting',
    () => {
      const arr = Array.from({ length: 10000 }, () => Math.random());
      return arr.sort((a, b) => a - b);
    }
  );
  
  console.log(`Sync operation completed in ${syncDuration.toFixed(2)}ms, sorted ${syncResult.length} items`);
  
  // Measure an asynchronous operation
  const { result: asyncResult, duration: asyncDuration } = await measureOperation(
    'Async Data Fetch',
    async () => {
      return new Promise(resolve => {
        setTimeout(() => resolve('Fetched data'), 100);
      });
    }
  );
  
  console.log(`Async operation completed in ${asyncDuration.toFixed(2)}ms, result: ${asyncResult}`);
};

// Example: Performance logging
export const examplePerformanceLogging = () => {
  console.log('🚀 Example: Performance Logging');
  
  // Log different types of performance events
  logPerformanceInfo('TestComponent', 'Component initialized successfully');
  logPerformanceWarning('TestComponent', 'Render time exceeded threshold', { renderTime: 18.5 });
  
  // Simulate some component activity
  startRenderMeasurement('TestComponent');
  setTimeout(() => {
    endRenderMeasurement('TestComponent');
    
    // Generate and print a performance report
    const report = generatePerformanceReport();
    console.log('Performance Report:', report);
    
    // Print formatted report to console
    printPerformanceReport();
  }, 50);
};

// Example: Performance summary
export const examplePerformanceSummary = () => {
  console.log('🚀 Example: Performance Summary');
  
  // Create some sample data
  const components = ['NoteCard', 'NoteList', 'NoteEditor'];
  
  components.forEach((componentName, index) => {
    for (let i = 0; i < (index + 1) * 3; i++) {
      startRenderMeasurement(componentName);
      
      // Simulate different performance characteristics
      const baseTime = (index + 1) * 5; // Different base times for each component
      const variance = Math.random() * 10;
      const renderTime = baseTime + variance;
      
      const startTime = performance.now();
      while (performance.now() - startTime < renderTime) {
        // Busy wait
      }
      
      endRenderMeasurement(componentName);
      
      // Simulate memoization with different hit rates
      const hitRate = 0.8 - (index * 0.2); // Decreasing hit rates
      if (Math.random() < hitRate) {
        recordMemoizationHit(componentName);
      } else {
        recordMemoizationMiss(componentName);
      }
    }
  });
  
  // Get and display summary
  const summary = getPerformanceSummary();
  console.log('Performance Summary:', summary);
  
  // Get all metrics
  const allMetrics = getAllPerformanceMetrics();
  console.log('All Component Metrics:');
  allMetrics.forEach((metrics, componentName) => {
    console.log(`  ${componentName}:`, {
      renders: metrics.renderCount,
      avgTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
      hitRate: `${(metrics.memoizationHitRate * 100).toFixed(1)}%`
    });
  });
};

// Run all examples
export const runAllExamples = async () => {
  console.log('🎯 Running Performance Utils Examples\n');
  
  try {
    exampleComponentMeasurement();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await exampleOperationMeasurement();
    console.log('\n' + '='.repeat(50) + '\n');
    
    examplePerformanceLogging();
    console.log('\n' + '='.repeat(50) + '\n');
    
    examplePerformanceSummary();
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
};

// Export for use in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Make examples available globally for testing in browser console
  (window as any).performanceExamples = {
    runAllExamples,
    exampleComponentMeasurement,
    exampleOperationMeasurement,
    examplePerformanceLogging,
    examplePerformanceSummary
  };
}