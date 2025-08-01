# Performance Measurement Infrastructure

This directory contains a comprehensive performance measurement infrastructure for React components, designed to help identify and optimize performance bottlenecks in the Scribble application.

## Overview

The performance measurement infrastructure consists of:

1. **Core Utilities** (`performanceUtils.ts`) - Low-level performance tracking
2. **React Hooks** (`usePerformanceMonitoring.ts`) - React integration hooks
3. **Logging System** (`performanceLogger.ts`) - Structured logging and reporting
4. **Dashboard Component** (`PerformanceDashboard.tsx`) - Visual monitoring interface
5. **Examples** (`*.example.*`) - Usage examples and integration patterns

## Quick Start

### Basic Component Performance Tracking

```typescript
import { useRenderPerformance } from '../hooks/usePerformanceMonitoring';

const MyComponent: React.FC = () => {
  // Automatically track render performance
  useRenderPerformance('MyComponent');
  
  return <div>My Component</div>;
};
```

### Memoization Tracking

```typescript
import { useMemoizationTracking } from '../hooks/usePerformanceMonitoring';

const MyComponent: React.FC<{ data: any[] }> = ({ data }) => {
  // Track memoization effectiveness
  useMemoizationTracking('MyComponent', [data]);
  
  const processedData = useMemo(() => {
    return data.map(item => processItem(item));
  }, [data]);
  
  return <div>{processedData.length} items</div>;
};
```

### Operation Measurement

```typescript
import { useOperationMeasurement } from '../hooks/usePerformanceMonitoring';

const MyComponent: React.FC = () => {
  const { measureOperation } = useOperationMeasurement();
  
  const handleExpensiveOperation = async () => {
    const { result, duration } = await measureOperation('Data Processing', async () => {
      return await processLargeDataset();
    });
    
    console.log(`Processing took ${duration}ms`);
    return result;
  };
  
  return <button onClick={handleExpensiveOperation}>Process Data</button>;
};
```

## Core API Reference

### Performance Utils

```typescript
// Start/end render measurement
startRenderMeasurement(componentName: string): void
endRenderMeasurement(componentName: string): number

// Memoization tracking
recordMemoizationHit(componentName: string): void
recordMemoizationMiss(componentName: string): void

// Get metrics
getComponentMetrics(componentName: string): PerformanceMetrics | undefined
getAllPerformanceMetrics(): Map<string, PerformanceMetrics>
getPerformanceSummary(): PerformanceSummary

// Operation measurement
measureOperation<T>(name: string, operation: () => T | Promise<T>): Promise<{ result: T; duration: number }>
```

### React Hooks

```typescript
// Automatic render performance tracking
useRenderPerformance(componentName: string, enabled?: boolean)

// Memoization effectiveness tracking
useMemoizationTracking(componentName: string, dependencies: any[], enabled?: boolean)

// Operation measurement utilities
useOperationMeasurement(enabled?: boolean)

// Get performance metrics
usePerformanceMetrics(componentName: string, autoLog?: boolean)

// Comprehensive debugging
usePerformanceDebug(componentName: string, options?: DebugOptions)
```

### Performance Logger

```typescript
// Logging functions
logPerformanceInfo(componentName: string, message: string, data?: any): void
logPerformanceWarning(componentName: string, message: string, data?: any): void
logPerformanceError(componentName: string, message: string, data?: any): void

// Reporting
generatePerformanceReport(): PerformanceReport
printPerformanceReport(): void
exportPerformanceData(): string
```

## Performance Dashboard

The `PerformanceDashboard` component provides a visual interface for monitoring performance in development:

```typescript
import { PerformanceDashboard } from '../components/PerformanceDashboard';

const App: React.FC = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  
  return (
    <div>
      {/* Your app content */}
      
      {process.env.NODE_ENV === 'development' && (
        <PerformanceDashboard 
          isVisible={showDashboard}
          onClose={() => setShowDashboard(false)}
        />
      )}
    </div>
  );
};
```

## Integration Patterns

### Optimized Component Pattern

```typescript
const OptimizedComponent = React.memo(({ data, onAction }) => {
  // Performance tracking
  useRenderPerformance('OptimizedComponent');
  useMemoizationTracking('OptimizedComponent', [data]);
  
  // Memoized computations
  const processedData = useMemo(() => {
    return expensiveProcessing(data);
  }, [data]);
  
  // Memoized callbacks
  const handleAction = useCallback((item) => {
    onAction(item);
  }, [onAction]);
  
  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} onClick={handleAction} />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo
  return shallowEqual(prevProps, nextProps);
});
```

### Performance Monitoring Wrapper

```typescript
const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  return React.forwardRef<any, P>((props, ref) => {
    useRenderPerformance(componentName);
    return <WrappedComponent {...props} ref={ref} />;
  });
};

// Usage
const MonitoredComponent = withPerformanceMonitoring(MyComponent, 'MyComponent');
```

## Development Workflow

### 1. Baseline Measurement

Before optimization, establish baseline performance:

```typescript
// In development console
import { measureBaseline, logPerformanceMetrics } from './performanceUtils';

// Measure baseline performance
const baseline = await measureBaseline('ComponentName', 10);
console.log('Baseline:', baseline);
```

### 2. Add Performance Tracking

Add performance hooks to components:

```typescript
const Component = () => {
  useRenderPerformance('Component');
  // ... component logic
};
```

### 3. Identify Issues

Use the performance dashboard or console logging:

```typescript
// View performance report
printPerformanceReport();

// Check specific component
logPerformanceMetrics('ComponentName');
```

### 4. Apply Optimizations

Implement React optimization patterns:
- `React.memo` for component memoization
- `useMemo` for expensive computations
- `useCallback` for event handlers
- State consolidation with `useReducer`

### 5. Validate Improvements

Compare before/after metrics:

```typescript
import { comparePerformance } from './performanceUtils';

const improvement = comparePerformance(beforeMetrics, afterMetrics);
console.log('Improvement:', improvement);
```

## Performance Thresholds

The system uses these default thresholds:

- **Render Time**: 16ms (60fps target)
- **Render Count**: 50 renders per component
- **Memoization Hit Rate**: 30% minimum effectiveness

Components exceeding these thresholds will generate warnings in the performance logs.

## Best Practices

1. **Development Only**: Performance tracking is automatically disabled in production
2. **Selective Monitoring**: Only monitor components that are frequently rendered or suspected of performance issues
3. **Baseline First**: Always measure baseline performance before optimization
4. **Incremental Changes**: Apply one optimization at a time to measure individual impact
5. **Regular Monitoring**: Use the dashboard during development to catch regressions early

## Troubleshooting

### Common Issues

1. **No Performance Data**: Ensure `NODE_ENV=development` and components are actually rendering
2. **Inconsistent Measurements**: Browser dev tools or other extensions can affect timing
3. **Memory Leaks**: The system automatically limits stored measurements to prevent memory issues

### Debug Mode

Enable comprehensive debugging:

```typescript
const Component = () => {
  usePerformanceDebug('Component', {
    trackRenders: true,
    trackMemoization: true,
    autoLog: true,
    logInterval: 5000
  });
  
  // ... component logic
};
```

## Examples

See the example files for complete integration patterns:
- `performanceUtils.example.ts` - Core utility usage
- `performanceIntegration.example.tsx` - React component integration

## Contributing

When adding new performance utilities:

1. Follow the existing naming conventions
2. Add TypeScript types for all public APIs
3. Include development-only guards (`process.env.NODE_ENV === 'development'`)
4. Add usage examples
5. Update this documentation