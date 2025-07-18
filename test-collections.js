// Simple test to verify collection service functionality
// This would normally be run in the browser context

console.log('Testing collection service...');

// Mock the window.fileOps for testing
global.window = {
  fileOps: {
    saveCollectionsFile: async (data, location) => {
      console.log('Mock save:', { data: JSON.parse(data), location });
      return { success: true, filePath: `${location}/collections.json` };
    },
    readCollectionsFile: async (location) => {
      console.log('Mock read:', { location });
      // Return null to simulate no existing file
      return null;
    }
  }
};

// Mock settings service
const mockSettings = { saveLocation: '/test/path' };
global.getSettings = () => mockSettings;

console.log('Collection service test setup complete');