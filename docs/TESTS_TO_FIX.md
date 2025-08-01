# Tests That Need to Be Fixed

These tests were temporarily removed during the Vitest setup but should be fixed and re-added later.

## 🚫 Removed Tests (Need Fixing)

### 1. E2E Collection Tests
**Original Location:** `src/__tests__/collections.e2e.test.ts`
**Issues:** 
- Mock functions using `vi.fn()` instead of real E2E framework
- Not actually E2E tests, more like integration tests
- Need proper E2E framework (Playwright/Cypress) or conversion to integration tests

**Coverage:** 
- Collection creation workflows
- Note organization
- Collection management
- Keyboard navigation
- Error recovery
- Session persistence

### 2. MainApp Integration Tests  
**Original Location:** `src/main-window/__tests__/MainApp.integration.test.tsx`
**Issues:**
- `vi.mock()` not working at top level
- Complex service mocking
- Import/export conflicts

**Coverage:**
- Main app initialization
- Service integration
- Component interaction
- Error handling

### 3. CollectionTabs Component Tests
**Original Location:** `src/main-window/components/__tests__/CollectionTabs.test.tsx`
**Issues:**
- Import/export mismatch (default vs named export)
- Complex mocking setup
- Service integration testing

**Coverage:**
- Collection tab rendering
- User interactions
- State management
- Error handling

## 🔧 How to Fix (Future Task)

### Step 1: Fix Mocking Issues
- Move `vi.mock()` calls to top level properly
- Set up proper mock implementations
- Fix import/export issues

### Step 2: Simplify Test Structure
- Break down complex integration tests into smaller units
- Use proper test utilities for React component testing
- Mock external dependencies properly

### Step 3: Consider E2E Strategy
- Decide if you want real E2E tests (Playwright) or integration tests
- Set up proper E2E framework if needed
- Convert mock-based E2E tests to proper integration tests

## ⏰ When to Fix

**Priority:** Medium (after performance optimization work)
**Estimated Time:** 4-6 hours
**Dependencies:** None (can be done anytime)

## 💡 Notes

- These tests represent good coverage of important features
- The test logic is mostly sound, just technical setup issues
- Worth fixing when you have dedicated time for testing improvements
- Don't let them block current development work