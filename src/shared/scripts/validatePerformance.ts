/**
 * Performance validation script
 * Run this script to validate performance improvements
 */

import {
  runPerformanceValidationSuite,
  printValidationResults,
  exportValidationResults,
  type ValidationSuite
} from '../utils/performanceValidation';
import type { Note } from '../types/Note';
import type { SortOption } from '../services/settingsService';

// Mock data for testing
const createMockNotes = (count: number): Note[] => {
  const notes: Note[] = [];
  
  for (let i = 0; i < count; i++) {
    notes.push({
      id: `note-${i}`,
      title: `Test Note ${i}`,
      content: `This is the content of test note ${i}. It contains some sample text to simulate real note content.`,
      createdAt: new Date(Date.now() - i * 1000 * 60 * 60), // Spread over hours
      updatedAt: new Date(Date.now() - i * 1000 * 60 * 30), // Updated more recently
      color: i % 3 === 0 ? '#fff9c4' : i % 3 === 1 ? '#fecaca' : '#bfdbfe',
      favorite: i % 5 === 0, // Every 5th note is favorite
      pinned: i % 7 === 0,   // Every 7th note is pinned
      transparency: 1
    });
  }
  
  return notes;
};

const createMockSortOptions = (): SortOption[] => {
  return [
    { label: 'Title (A-Z)', field: 'title', direction: 'asc' },
    { label: 'Title (Z-A)', field: 'title', direction: 'desc' },
    { label: 'Date Created (Newest)', field: 'createdAt', direction: 'desc' },
    { label: 'Date Created (Oldest)', field: 'createdAt', direction: 'asc' },
    { label: 'Date Modified (Newest)', field: 'updatedAt', direction: 'desc' },
    { label: 'Date Modified (Oldest)', field: 'updatedAt', direction: 'asc' }
  ];
};

// Main validation function
export const runPerformanceValidation = async (
  noteCount: number = 100,
  exportResults: boolean = true
): Promise<ValidationSuite> => {
  console.log('🚀 Starting Performance Validation...');
  console.log(`Testing with ${noteCount} notes`);
  
  // Create test data
  const mockNotes = createMockNotes(noteCount);
  const sortOptions = createMockSortOptions();
  
  try {
    // Run validation suite
    const validationSuite = await runPerformanceValidationSuite(mockNotes, sortOptions);
    
    // Print results to console
    printValidationResults(validationSuite);
    
    // Export results if requested
    if (exportResults) {
      const exportData = exportValidationResults();
      console.log('\n📄 Validation results exported to console. Copy the following JSON to save:');
      console.log(exportData);
    }
    
    // Summary
    console.log('\n📊 Validation Summary:');
    console.log(`Overall Status: ${validationSuite.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Tests Passed: ${validationSuite.summary.passedTests}/${validationSuite.summary.totalTests}`);
    console.log(`Average Performance Improvement: ${validationSuite.summary.averageImprovement.toFixed(2)}ms`);
    
    if (!validationSuite.overallPassed) {
      console.log('\n⚠️ Some tests failed. Check the recommendations above for optimization suggestions.');
    } else {
      console.log('\n🎉 All performance tests passed! Optimizations are working effectively.');
    }
    
    return validationSuite;
    
  } catch (error) {
    console.error('❌ Performance validation failed:', error);
    throw error;
  }
};

// Quick validation with different data sizes
export const runQuickValidation = async (): Promise<void> => {
  console.log('🏃‍♂️ Running Quick Performance Validation...');
  
  const testSizes = [10, 50, 100];
  
  for (const size of testSizes) {
    console.log(`\n--- Testing with ${size} notes ---`);
    try {
      const result = await runPerformanceValidation(size, false);
      console.log(`${size} notes: ${result.overallPassed ? '✅ PASSED' : '❌ FAILED'} (${result.summary.averageImprovement.toFixed(2)}ms improvement)`);
    } catch (error) {
      console.log(`${size} notes: ❌ ERROR - ${error}`);
    }
  }
};

// Validation with performance regression detection
export const runRegressionValidation = async (
  baselineResults?: ValidationSuite
): Promise<{
  currentResults: ValidationSuite;
  regressions: string[];
  improvements: string[];
}> => {
  console.log('🔍 Running Regression Validation...');
  
  const currentResults = await runPerformanceValidation(100, false);
  const regressions: string[] = [];
  const improvements: string[] = [];
  
  if (baselineResults) {
    // Compare with baseline
    currentResults.results.forEach((currentResult, index) => {
      const baselineResult = baselineResults.results[index];
      if (baselineResult) {
        const currentImprovement = currentResult.improvements.renderTimeReduction;
        const baselineImprovement = baselineResult.improvements.renderTimeReduction;
        
        if (currentImprovement < baselineImprovement - 1) {
          regressions.push(
            `${currentResult.testName}: Performance regressed by ${(baselineImprovement - currentImprovement).toFixed(2)}ms`
          );
        } else if (currentImprovement > baselineImprovement + 1) {
          improvements.push(
            `${currentResult.testName}: Performance improved by ${(currentImprovement - baselineImprovement).toFixed(2)}ms`
          );
        }
      }
    });
    
    console.log('\n📈 Regression Analysis:');
    if (regressions.length > 0) {
      console.log('⚠️ Regressions detected:');
      regressions.forEach(regression => console.log(`  • ${regression}`));
    }
    
    if (improvements.length > 0) {
      console.log('✅ Additional improvements:');
      improvements.forEach(improvement => console.log(`  • ${improvement}`));
    }
    
    if (regressions.length === 0 && improvements.length === 0) {
      console.log('📊 Performance is stable compared to baseline');
    }
  }
  
  return {
    currentResults,
    regressions,
    improvements
  };
};

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  (window as any).performanceValidation = {
    runPerformanceValidation,
    runQuickValidation,
    runRegressionValidation
  };
  
  console.log('🔧 Performance validation tools available in window.performanceValidation');
  console.log('Usage:');
  console.log('  window.performanceValidation.runPerformanceValidation(100) - Full validation with 100 notes');
  console.log('  window.performanceValidation.runQuickValidation() - Quick validation with multiple sizes');
  console.log('  window.performanceValidation.runRegressionValidation() - Regression testing');
}