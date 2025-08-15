import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.fileOps for tests
const mockFileOps = {
  // Legacy mocks still used in some places
  saveCollectionsFile: vi.fn(),
  readCollectionsFile: vi.fn(),
  saveNotesFile: vi.fn(),
  readNotesFile: vi.fn(),
  saveSettingsFile: vi.fn(),
  readSettingsFile: vi.fn(),

  // Newer, IPC-exposed note file operations used by services
  listNoteFiles: vi.fn().mockResolvedValue([]),
  saveNoteToFile: vi.fn().mockResolvedValue({ success: true, filePath: '/tmp/fake.md' }),
  deleteNoteFile: vi.fn().mockResolvedValue({ success: true, filePath: '/tmp/fake.md' }),
  readNoteFile: vi.fn().mockResolvedValue(''),
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