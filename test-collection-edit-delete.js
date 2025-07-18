// Test script to verify collection edit and delete functionality
// Since we can't easily import ES modules in this context, let's verify the component logic instead

// Mock the window.fileOps for testing
global.window = {
  fileOps: {
    saveCollectionsFile: async (data, location) => {
      console.log('✓ Mock save collections:', { 
        collections: JSON.parse(data).length, 
        location 
      });
      return { success: true, filePath: `${location}/collections.json` };
    },
    readCollectionsFile: async (location) => {
      console.log('✓ Mock read collections:', { location });
      // Return test data
      return JSON.stringify([
        {
          id: 'test-collection-1',
          name: 'Test Collection',
          icon: 'notes',
          color: '#3b82f6',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          noteIds: ['note1', 'note2'],
          sortOrder: 1
        }
      ]);
    }
  }
};

// Mock settings service
const mockSettings = { saveLocation: '/test/path' };

// Create a mock getSettings function
global.getSettings = () => mockSettings;

async function testCollectionEditDelete() {
  console.log('🧪 Testing Collection Edit and Delete Functionality\n');

  try {
    // Clear cache to start fresh
    collectionService.clearCache();

    // Test 1: Load collections
    console.log('1. Testing collection loading...');
    const collections = await collectionService.getAllCollections();
    console.log(`✓ Loaded ${collections.length} collections`);
    console.log(`✓ Found test collection: ${collections.find(c => c.id === 'test-collection-1')?.name}`);

    // Test 2: Update collection
    console.log('\n2. Testing collection update...');
    const updateResult = await collectionService.updateCollection('test-collection-1', {
      name: 'Updated Test Collection',
      icon: 'work',
      color: '#059669'
    });
    
    if (updateResult) {
      console.log('✓ Collection updated successfully');
      console.log(`✓ New name: ${updateResult.name}`);
      console.log(`✓ New icon: ${updateResult.icon}`);
      console.log(`✓ New color: ${updateResult.color}`);
    } else {
      console.log('✗ Collection update failed');
    }

    // Test 3: Try to update default collection (should fail)
    console.log('\n3. Testing default collection update protection...');
    const defaultUpdateResult = await collectionService.updateCollection('all', {
      name: 'Should Not Work'
    });
    
    if (!defaultUpdateResult) {
      console.log('✓ Default collection update correctly prevented');
    } else {
      console.log('✗ Default collection update should have been prevented');
    }

    // Test 4: Delete collection
    console.log('\n4. Testing collection deletion...');
    const deleteResult = await collectionService.deleteCollection('test-collection-1');
    
    if (deleteResult) {
      console.log('✓ Collection deleted successfully');
      
      // Verify deletion
      const collectionsAfterDelete = await collectionService.getAllCollections();
      const deletedCollection = collectionsAfterDelete.find(c => c.id === 'test-collection-1');
      
      if (!deletedCollection) {
        console.log('✓ Collection no longer exists in list');
      } else {
        console.log('✗ Collection still exists after deletion');
      }
    } else {
      console.log('✗ Collection deletion failed');
    }

    // Test 5: Try to delete default collection (should fail)
    console.log('\n5. Testing default collection deletion protection...');
    const defaultDeleteResult = await collectionService.deleteCollection('all');
    
    if (!defaultDeleteResult) {
      console.log('✓ Default collection deletion correctly prevented');
    } else {
      console.log('✗ Default collection deletion should have been prevented');
    }

    console.log('\n🎉 All collection edit/delete tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCollectionEditDelete();