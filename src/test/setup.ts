import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.fileOps for tests
const mockFileOps = {
  saveCollectionsFile: vi.fn(),
  readCollectionsFile: vi.fn(),
  saveNotesFile: vi.fn(),
  readNotesFile: vi.fn(),
  saveSettingsFile: vi.fn(),
  readSettingsFile: vi.fn(),
}

// Add fileOps to window
Object.defineProperty(window, 'fileOps', {
  value: mockFileOps,
  writable: true,
})

// Mock performance.now for consistent testing
Object.defineProperty(performance, 'now', {
  value: vi.fn(() => Date.now()),
  writable: true,
})

// Export mocks for use in tests
export { mockFileOps }