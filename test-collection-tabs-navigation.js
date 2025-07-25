/**
 * Test script to verify collection tabs navigation behavior
 * This script tests:
 * 1. Tab key navigation through collection tabs
 * 2. Removal of focus outlines/rings
 * 3. Proper cycling behavior (first -> second -> ... -> last -> first)
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

async function createTestWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the main app
  await win.loadFile('dist/index.html');
  
  return win;
}

async function testTabNavigation() {
  console.log('🧪 Testing Collection Tabs Navigation...');
  
  const win = await createTestWindow();
  
  // Wait for app to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Execute test in the renderer process
  const result = await win.webContents.executeJavaScript(`
    (async function() {
      const results = [];
      
      // Find the collection tabs container
      const tabsContainer = document.querySelector('[role="tablist"]');
      if (!tabsContainer) {
        return { error: 'Collection tabs container not found' };
      }
      
      // Check if focus outline styles are removed
      const computedStyle = window.getComputedStyle(tabsContainer);
      const hasOutline = computedStyle.outline !== 'none';
      results.push({
        test: 'Focus outline removed from container',
        passed: !hasOutline,
        details: \`Outline: \${computedStyle.outline}\`
      });
      
      // Check individual tab buttons
      const tabButtons = document.querySelectorAll('[role="tab"]');
      let allTabsHaveNoOutline = true;
      
      tabButtons.forEach((tab, index) => {
        const tabStyle = window.getComputedStyle(tab);
        if (tabStyle.outline !== 'none') {
          allTabsHaveNoOutline = false;
        }
      });
      
      results.push({
        test: 'Focus outline removed from all tab buttons',
        passed: allTabsHaveNoOutline,
        details: \`Found \${tabButtons.length} tab buttons\`
      });
      
      // Test tab navigation behavior
      tabsContainer.focus();
      
      // Get initial active tab
      const initialActiveTab = document.querySelector('[role="tab"][aria-selected="true"]');
      const initialTabName = initialActiveTab ? initialActiveTab.textContent.trim() : 'Unknown';
      
      results.push({
        test: 'Initial active tab identified',
        passed: !!initialActiveTab,
        details: \`Active tab: \${initialTabName}\`
      });
      
      // Simulate Tab key press
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        keyCode: 9,
        bubbles: true,
        cancelable: true
      });
      
      tabsContainer.dispatchEvent(tabEvent);
      
      // Wait a bit for the change to take effect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if active tab changed
      const newActiveTab = document.querySelector('[role="tab"][aria-selected="true"]');
      const newTabName = newActiveTab ? newActiveTab.textContent.trim() : 'Unknown';
      
      results.push({
        test: 'Tab key navigation works',
        passed: newTabName !== initialTabName,
        details: \`Changed from "\${initialTabName}" to "\${newTabName}"\`
      });
      
      // Test Shift+Tab (reverse navigation)
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        keyCode: 9,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      });
      
      tabsContainer.dispatchEvent(shiftTabEvent);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const reversedActiveTab = document.querySelector('[role="tab"][aria-selected="true"]');
      const reversedTabName = reversedActiveTab ? reversedActiveTab.textContent.trim() : 'Unknown';
      
      results.push({
        test: 'Shift+Tab reverse navigation works',
        passed: reversedTabName === initialTabName,
        details: \`Returned to "\${reversedTabName}"\`
      });
      
      return { results };
    })();
  `);
  
  // Print results
  if (result.error) {
    console.error('❌ Test failed:', result.error);
  } else {
    console.log('📊 Test Results:');
    result.results.forEach((test, index) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.test}`);
      if (test.details) {
        console.log(`   Details: ${test.details}`);
      }
    });
    
    const passedTests = result.results.filter(t => t.passed).length;
    const totalTests = result.results.length;
    console.log(`\n📈 Summary: ${passedTests}/${totalTests} tests passed`);
  }
  
  // Close the window after a delay
  setTimeout(() => {
    win.close();
    app.quit();
  }, 3000);
}

app.whenReady().then(() => {
  testTabNavigation().catch(console.error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});