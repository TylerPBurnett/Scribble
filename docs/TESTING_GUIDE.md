# Testing Suite Guide

Complete guide for using the Vitest + Bun testing setup efficiently during development.

## 🚀 Essential Test Commands

### Basic Commands
```bash
# Run all tests once (good for CI/validation)
bun test --run

# Run tests in watch mode (best for development)
bun test

# Run specific test file
bun test performanceUtils

# Run tests with pattern matching
bun test "performance"

# Run tests with beautiful web UI
bun test:ui
```

### Advanced Commands
```bash
# Run tests and show coverage
bun test --coverage

# Run tests in specific directory
bun test src/shared/utils

# Run tests with verbose output
bun test --reporter=verbose

# Run only changed files (if using git)
bun test --changed
```

## 🎯 Development Workflow Tips

### 1. Watch Mode is Your Friend
```bash
# Start this in a terminal and leave it running
bun test
```
**Benefits:**
- ✅ Tests auto-run when you save files
- ✅ Instant feedback on changes
- ✅ Only runs affected tests
- ✅ Shows clear pass/fail status

### 2. Use the Web UI for Deep Debugging
```bash
bun test:ui
```
**When to use:**
- 🔍 When tests fail and you need to debug
- 📊 To see test coverage visually
- 🎯 To run specific tests interactively
- 📈 To analyze test performance

### 3. Focus on Specific Tests
```bash
# When working on NoteCard component
bun test NoteCard

# When working on performance utilities
bun test performance

# Run just one test file
bun test src/shared/utils/__tests__/performanceUtils.test.ts
```

## 🧪 Writing Tests During Performance Work

### Quick Test Template
```typescript
// src/components/__tests__/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render without crashing', () => {
    render(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should not re-render when props unchanged', () => {
    const { rerender } = render(<MyComponent data="test" />);
    
    // This should not cause re-render due to memoization
    rerender(<MyComponent data="test" />);
    
    // Add your performance assertions here
  });
});
```

### Performance-Specific Test Patterns
```typescript
// Test memoization works
it('should memoize expensive calculations', () => {
  const expensiveFunction = vi.fn(() => 'result');
  const { rerender } = render(<Component calculate={expensiveFunction} data="same" />);
  
  rerender(<Component calculate={expensiveFunction} data="same" />);
  
  expect(expensiveFunction).toHaveBeenCalledTimes(1); // Only called once
});

// Test render performance
it('should render quickly', () => {
  const start = performance.now();
  render(<Component />);
  const end = performance.now();
  
  expect(end - start).toBeLessThan(16); // Under 16ms for 60fps
});

// Test component doesn't re-render unnecessarily
it('should not re-render when parent re-renders', () => {
  let renderCount = 0;
  const TestComponent = React.memo(() => {
    renderCount++;
    return <div>Test</div>;
  });

  const { rerender } = render(
    <div>
      <TestComponent />
    </div>
  );

  // Parent re-renders but TestComponent shouldn't
  rerender(
    <div>
      <TestComponent />
    </div>
  );

  expect(renderCount).toBe(1);
});
```

## 📊 Interpreting Test Output

### Good Test Run
```
✓ Performance Utils > Basic Measurement > should measure render time correctly [0.13ms]
✓ MyComponent > should render without errors [2.1ms]

15 pass, 0 fail
```

### Failed Test
```
✗ MyComponent > should not re-render unnecessarily [5.2ms]
  Expected: 1
  Received: 3
  
  Component re-rendered 3 times instead of 1
```

### Performance Warning
```
✓ MyComponent > should render quickly [45.2ms]
⚠️  Test took longer than expected (45ms > 16ms)
```

## 🔧 Debugging Failed Tests

### 1. Use Console Logs
```typescript
it('should work correctly', () => {
  console.log('Debug info:', someValue);
  expect(someValue).toBe(expected);
});
```

### 2. Use the Web UI
```bash
bun test:ui
```
- Click on failed test to see details
- View stack traces
- See console output
- Re-run specific tests

### 3. Use Debugger
```typescript
it('should work correctly', () => {
  debugger; // Will pause in browser dev tools
  expect(someValue).toBe(expected);
});
```

### 4. Isolate the Problem
```bash
# Run just the failing test
bun test "specific test name"

# Run just the failing file
bun test failing-file.test.ts
```

## ⚡ Performance Testing Workflow

### Before Optimization
```bash
# Run tests to establish baseline
bun test --run

# All tests should pass
# Note any slow tests (>16ms for components)
```

### During Optimization
```bash
# Keep tests running in watch mode
bun test

# Tests will re-run as you make changes
# Immediate feedback if you break something
```

### After Optimization
```bash
# Run full test suite
bun test --run

# Check that performance improved
# Verify no functionality was broken
```

## 🎯 Integration with Performance Utils

Your performance utilities are already tested, so you can use them confidently:

```typescript
// In your components during development
import { useRenderPerformance } from '../hooks/usePerformanceMonitoring';

const MyComponent = () => {
  // This will track performance automatically in development
  useRenderPerformance('MyComponent');
  
  return <div>My Component</div>;
};
```

### Using Performance Utils in Tests
```typescript
import { 
  startRenderMeasurement, 
  endRenderMeasurement,
  getComponentMetrics 
} from '../utils/performanceUtils';

it('should have good render performance', () => {
  startRenderMeasurement('TestComponent');
  
  render(<TestComponent />);
  
  const renderTime = endRenderMeasurement('TestComponent');
  expect(renderTime).toBeLessThan(16); // 60fps target
  
  const metrics = getComponentMetrics('TestComponent');
  expect(metrics?.renderCount).toBe(1);
});
```

## 📋 Quick Reference Card

| Command | Use Case |
|---------|----------|
| `bun test` | Development (watch mode) |
| `bun test --run` | Validation (run once) |
| `bun test:ui` | Debugging/exploration |
| `bun test ComponentName` | Focus on specific component |
| `bun test --coverage` | Check test coverage |
| `bun test --reporter=verbose` | Detailed output |
| `bun test --changed` | Only changed files |

## 🚨 Common Issues & Solutions

### Issue: Tests are slow
```bash
# Check which tests are slow
bun test --reporter=verbose

# Run specific slow test to debug
bun test "slow test name"
```

### Issue: Tests fail randomly
```bash
# Run tests multiple times to confirm
bun test --run --repeat=5

# Check for async issues or race conditions
```

### Issue: Mocking not working
```typescript
// Make sure vi.mock is at the top level
vi.mock('../service', () => ({
  default: {
    method: vi.fn()
  }
}));

// Import after mocks
import Component from '../Component';
```

### Issue: React component tests failing
```typescript
// Make sure you have proper imports
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Wrap components that need providers
const renderWithProviders = (component) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};
```

## 🎯 Best Practices

### 1. Test Structure
- **Arrange**: Set up test data
- **Act**: Execute the code being tested
- **Assert**: Check the results

### 2. Test Naming
```typescript
// Good: Describes what should happen
it('should not re-render when props are unchanged', () => {});

// Bad: Vague or implementation-focused
it('should work', () => {});
```

### 3. Test Independence
- Each test should be able to run independently
- Use `beforeEach` to reset state
- Don't rely on test execution order

### 4. Performance Testing
- Test behavior, not implementation details
- Focus on user-visible performance
- Use realistic data sizes

## 🚀 Recommended Development Workflow

1. **Start watch mode**: `bun test` (leave running)
2. **Work on your code**: Make changes to components
3. **Get instant feedback**: Tests auto-run on save
4. **Debug if needed**: Use `bun test:ui` for complex issues
5. **Validate before commit**: `bun test --run`

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Performance Utils README](./src/shared/utils/PERFORMANCE_UTILS_README.md)

---

**Current Test Status**: ✅ 15 tests passing, 0 failing
**Performance Utils**: ✅ Fully tested and ready to use
**Test Speed**: ⚡ ~30ms execution time