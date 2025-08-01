import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import {
  startRenderMeasurement,
  endRenderMeasurement,
  recordMemoizationHit,
  recordMemoizationMiss,
  getComponentMetrics,
  getAllPerformanceMetrics,
  resetComponentMetrics,
  resetAllPerformanceMetrics,
  getPerformanceSummary,
  comparePerformance,
  measureOperation
} from '../performanceUtils';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn();

// Store original performance.now
const originalPerformanceNow = global.performance?.now;

beforeAll(() => {
  Object.defineProperty(global, 'performance', {
    value: {
      now: mockPerformanceNow
    },
    writable: true
  });
});

afterAll(() => {
  if (originalPerformanceNow) {
    Object.defineProperty(global, 'performance', {
      value: {
        now: originalPerformanceNow
      }
    });
  }
});

describe('Performance Utils', () => {
  beforeEach(() => {
    // Set to development mode for testing
    process.env.NODE_ENV = 'development';
    resetAllPerformanceMetrics();
    mockPerformanceNow.mockClear();
    vi.clearAllMocks();
  });

  describe('Basic Measurement', () => {
    it('should measure render time correctly', () => {
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(116);

      startRenderMeasurement('TestComponent');
      const renderTime = endRenderMeasurement('TestComponent');

      expect(renderTime).toBe(16);
      
      const metrics = getComponentMetrics('TestComponent');
      expect(metrics).toBeDefined();
      expect(metrics!.renderCount).toBe(1);
      expect(metrics!.lastRenderTime).toBe(16);
      expect(metrics!.averageRenderTime).toBe(16);
    });

    it('should handle multiple renders correctly', () => {
      mockPerformanceNow
        .mockReturnValueOnce(100).mockReturnValueOnce(116) // First render: 16ms
        .mockReturnValueOnce(200).mockReturnValueOnce(208); // Second render: 8ms

      // First render
      startRenderMeasurement('TestComponent');
      endRenderMeasurement('TestComponent');

      // Second render
      startRenderMeasurement('TestComponent');
      endRenderMeasurement('TestComponent');

      const metrics = getComponentMetrics('TestComponent');
      expect(metrics!.renderCount).toBe(2);
      expect(metrics!.lastRenderTime).toBe(8);
      expect(metrics!.averageRenderTime).toBe(12); // (16 + 8) / 2
      expect(metrics!.totalTime).toBe(24);
    });

    it('should handle missing start time gracefully', () => {
      const renderTime = endRenderMeasurement('NonExistentComponent');
      expect(renderTime).toBe(0);
    });
  });

  describe('Memoization Tracking', () => {
    it('should track memoization hits and misses', () => {
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(116);
      
      // Initialize component first
      startRenderMeasurement('TestComponent');
      endRenderMeasurement('TestComponent');

      recordMemoizationHit('TestComponent');
      recordMemoizationHit('TestComponent');
      recordMemoizationMiss('TestComponent');

      const metrics = getComponentMetrics('TestComponent');
      expect(metrics!.memoizationHitRate).toBe(2/3); // 2 hits out of 3 total
    });

    it('should handle memoization tracking for new components', () => {
      recordMemoizationHit('NewComponent');
      recordMemoizationMiss('NewComponent');

      const metrics = getComponentMetrics('NewComponent');
      expect(metrics!.memoizationHitRate).toBe(0.5);
    });
  });

  describe('Metrics Management', () => {
    it('should reset component metrics', () => {
      startRenderMeasurement('TestComponent');
      endRenderMeasurement('TestComponent');

      expect(getComponentMetrics('TestComponent')).toBeDefined();

      resetComponentMetrics('TestComponent');
      expect(getComponentMetrics('TestComponent')).toBeUndefined();
    });

    it('should reset all metrics', () => {
      startRenderMeasurement('Component1');
      endRenderMeasurement('Component1');
      startRenderMeasurement('Component2');
      endRenderMeasurement('Component2');

      expect(getAllPerformanceMetrics().size).toBe(2);

      resetAllPerformanceMetrics();
      expect(getAllPerformanceMetrics().size).toBe(0);
    });
  });

  describe('Performance Summary', () => {
    it('should generate correct performance summary', () => {
      mockPerformanceNow
        .mockReturnValueOnce(100).mockReturnValueOnce(116) // Component1: 16ms
        .mockReturnValueOnce(200).mockReturnValueOnce(204); // Component2: 4ms

      startRenderMeasurement('SlowComponent');
      endRenderMeasurement('SlowComponent');

      startRenderMeasurement('FastComponent');
      endRenderMeasurement('FastComponent');

      const summary = getPerformanceSummary();
      expect(summary.totalComponents).toBe(2);
      expect(summary.totalRenders).toBe(2);
      expect(summary.averageRenderTime).toBe(10); // (16 + 4) / 2
      expect(summary.slowestComponent).toBe('SlowComponent');
      expect(summary.fastestComponent).toBe('FastComponent');
    });

    it('should handle empty metrics', () => {
      const summary = getPerformanceSummary();
      expect(summary.totalComponents).toBe(0);
      expect(summary.totalRenders).toBe(0);
      expect(summary.averageRenderTime).toBe(0);
      expect(summary.slowestComponent).toBeNull();
      expect(summary.fastestComponent).toBeNull();
    });
  });

  describe('Performance Comparison', () => {
    it('should compare performance metrics correctly', () => {
      const beforeMetrics = {
        componentName: 'TestComponent',
        renderCount: 10,
        averageRenderTime: 20,
        lastRenderTime: 18,
        memoizationHitRate: 0.3,
        totalTime: 200,
        measurements: [20, 18, 22]
      };

      const afterMetrics = {
        componentName: 'TestComponent',
        renderCount: 8,
        averageRenderTime: 12,
        lastRenderTime: 10,
        memoizationHitRate: 0.7,
        totalTime: 96,
        measurements: [12, 10, 14]
      };

      const result = comparePerformance(beforeMetrics, afterMetrics);

      expect(result.improvement.renderTimeReduction).toBe(8); // 20 - 12
      expect(result.improvement.renderCountReduction).toBe(2); // 10 - 8
      expect(result.before).toBe(beforeMetrics);
      expect(result.after).toBe(afterMetrics);
    });
  });

  describe('Operation Measurement', () => {
    it('should measure synchronous operations', async () => {
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(150);

      const operation = () => 'test result';
      const { result, duration } = await measureOperation('test-op', operation);

      expect(result).toBe('test result');
      expect(duration).toBe(50);
    });

    it('should measure asynchronous operations', async () => {
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(200);

      const asyncOperation = async () => {
        return new Promise(resolve => setTimeout(() => resolve('async result'), 10));
      };

      const { result, duration } = await measureOperation('async-op', asyncOperation);

      expect(result).toBe('async result');
      expect(duration).toBe(100);
    });
  });

  describe('Development Mode Behavior', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should only track in development mode', () => {
      process.env.NODE_ENV = 'production';

      startRenderMeasurement('TestComponent');
      const renderTime = endRenderMeasurement('TestComponent');

      expect(renderTime).toBe(0);
      expect(getComponentMetrics('TestComponent')).toBeUndefined();
    });

    it('should track in development mode', () => {
      process.env.NODE_ENV = 'development';
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(116);

      startRenderMeasurement('TestComponent');
      const renderTime = endRenderMeasurement('TestComponent');

      expect(renderTime).toBe(16);
      expect(getComponentMetrics('TestComponent')).toBeDefined();
    });
  });
});