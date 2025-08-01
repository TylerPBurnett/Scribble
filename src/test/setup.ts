import '@testing-library/jest-dom'

// Mock window.fileOps for tests
const mockFileOps = {
  saveCollectionsFile: vi.fn(),
  readCollectionsFile: vi.fn(),
  saveNotesFile: vi.fn(),
  readNotesFile: vi.fn(),
  saveSettingsFile: vi.fn(),
  readSettingsFile: vi.fn(),
}

Object.defineProperty(window, 'fileOps', {
  value: mockFileOps,
  writable: true,
})

// Mock performance.now for consistent testing
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now())
  }
})

// Export mocks for use in tests
export { mockFileOps }