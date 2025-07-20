#!/usr/bin/env node

/**
 * Test script to reproduce the hotkey save bug
 * This script simulates the exact scenario described in the requirements
 */

console.log('=== HOTKEY SAVE BUG REPRODUCTION TEST ===');
console.log('This script simulates changing a hotkey and saving settings');
console.log('');

// Mock localStorage for Node.js environment
const localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  clear() {
    this.data = {};
  }
};

// Mock DEFAULT_HOTKEYS (simplified version)
const DEFAULT_HOTKEYS = {
  'toggle-toolbar': 'Alt+T',
  'save-note': 'Cmd+S',
  'new-note': 'Cmd+N',
  'bold': 'Cmd+B',
  'italic': 'Cmd+I'
};

// Mock AppSettings interface
const DEFAULT_SETTINGS = {
  saveLocation: '/Users/test/Documents/Notes',
  autoSave: true,
  autoSaveInterval: 5,
  theme: 'dim',
  hotkeys: DEFAULT_HOTKEYS,
  autoLaunch: false,
  minimizeToTray: true,
  globalHotkeys: {
    newNote: 'CommandOrControl+Alt+N',
    toggleApp: 'CommandOrControl+Alt+S'
  }
};

// Simulate the getSettings function
function getSettings() {
  const settingsJson = localStorage.getItem('app_settings');
  console.log('Raw settings from localStorage:', settingsJson);
  if (!settingsJson) {
    console.log('No settings found, returning defaults');
    return DEFAULT_SETTINGS;
  }

  try {
    const settings = JSON.parse(settingsJson);
    console.log('Parsed settings:', settings);
    return settings;
  } catch (error) {
    console.error('Error parsing settings from localStorage:', error);
    return DEFAULT_SETTINGS;
  }
}

// Simulate the saveSettings function (simplified version)
function saveSettings(settings) {
  console.log('=== HOTKEY SAVE DEBUG: saveSettings started ===');
  console.log('Settings received in saveSettings:', JSON.stringify(settings, null, 2));
  console.log('Hotkeys property in received settings:', JSON.stringify(settings.hotkeys, null, 2));
  console.log('Type of hotkeys property:', typeof settings.hotkeys);
  console.log('Is hotkeys property defined?', settings.hotkeys !== undefined);
  console.log('Is hotkeys property null?', settings.hotkeys === null);
  console.log('Number of hotkey entries:', settings.hotkeys ? Object.keys(settings.hotkeys).length : 0);

  console.log('Settings before localStorage save:', JSON.stringify(settings, null, 2));
  console.log('Hotkeys before localStorage save:', JSON.stringify(settings.hotkeys, null, 2));

  // Save to localStorage
  const settingsJson = JSON.stringify(settings);
  console.log('JSON string being saved to localStorage:', settingsJson);
  localStorage.setItem('app_settings', settingsJson);
  console.log('Settings saved to localStorage');

  // Verify the save by reading back from localStorage
  const savedSettingsJson = localStorage.getItem('app_settings');
  console.log('Verification - Raw JSON read back from localStorage:', savedSettingsJson);
  
  if (savedSettingsJson) {
    try {
      const savedSettings = JSON.parse(savedSettingsJson);
      console.log('Verification - Parsed settings from localStorage:', JSON.stringify(savedSettings, null, 2));
      console.log('Verification - Hotkeys in localStorage:', JSON.stringify(savedSettings.hotkeys, null, 2));
      console.log('Verification - Do hotkeys match what we saved?', JSON.stringify(savedSettings.hotkeys) === JSON.stringify(settings.hotkeys));
      return true;
    } catch (error) {
      console.error('Verification - Error parsing settings from localStorage:', error);
      return false;
    }
  } else {
    console.error('Verification - No settings found in localStorage after save!');
    return false;
  }
}

// Simulate the SettingsDialog onSubmit function
function simulateOnSubmit(formValues, hotkeys) {
  console.log('=== HOTKEY SAVE DEBUG: onSubmit started ===');
  console.log('Form values received:', JSON.stringify(formValues, null, 2));
  console.log('Current hotkeys state:', JSON.stringify(hotkeys, null, 2));
  
  // Combine form values with hotkeys (this is where the bug might be)
  const combinedSettings = {
    ...formValues,
    hotkeys,
  };

  console.log('Combined settings after merging hotkeys:', JSON.stringify(combinedSettings, null, 2));
  console.log('Hotkeys property in combined settings:', JSON.stringify(combinedSettings.hotkeys, null, 2));
  console.log('Type of hotkeys property:', typeof combinedSettings.hotkeys);
  console.log('Is hotkeys property defined?', combinedSettings.hotkeys !== undefined);
  console.log('Is hotkeys property null?', combinedSettings.hotkeys === null);
  console.log('Number of hotkey entries:', combinedSettings.hotkeys ? Object.keys(combinedSettings.hotkeys).length : 0);

  console.log('Final combined settings before save:', JSON.stringify(combinedSettings, null, 2));
  console.log('Calling saveSettings with combined settings...');
  
  const saveResult = saveSettings(combinedSettings);
  console.log('=== HOTKEY SAVE DEBUG: onSubmit completed ===');
  return saveResult;
}

// Test scenario: User changes "Toggle editor toolbar" from Alt+T to Cmd+3
console.log('=== TEST SCENARIO ===');
console.log('User changes "Toggle editor toolbar" from Alt+T to Cmd+3');
console.log('');

// Step 1: Get initial settings
console.log('Step 1: Getting initial settings...');
const initialSettings = getSettings();
console.log('Initial hotkeys:', JSON.stringify(initialSettings.hotkeys, null, 2));
console.log('');

// Step 2: Simulate user changing hotkey
console.log('Step 2: User changes toggle-toolbar hotkey from Alt+T to Cmd+3...');
const modifiedHotkeys = {
  ...initialSettings.hotkeys,
  'toggle-toolbar': 'Cmd+3'  // User changed this
};
console.log('Modified hotkeys:', JSON.stringify(modifiedHotkeys, null, 2));
console.log('');

// Step 3: Simulate form values (other settings)
console.log('Step 3: Preparing form values...');
const formValues = {
  saveLocation: initialSettings.saveLocation,
  autoSave: initialSettings.autoSave,
  autoSaveInterval: initialSettings.autoSaveInterval,
  theme: initialSettings.theme,
  autoLaunch: initialSettings.autoLaunch,
  minimizeToTray: initialSettings.minimizeToTray,
  globalHotkeys: initialSettings.globalHotkeys
};
console.log('Form values:', JSON.stringify(formValues, null, 2));
console.log('');

// Step 4: Simulate the save process
console.log('Step 4: Simulating save process...');
const saveSuccess = simulateOnSubmit(formValues, modifiedHotkeys);
console.log('');

// Step 5: Verify the bug - check if hotkeys were actually saved
console.log('Step 5: Verifying if hotkeys were saved correctly...');
const savedSettings = getSettings();
console.log('Settings after save:', JSON.stringify(savedSettings, null, 2));
console.log('Hotkeys after save:', JSON.stringify(savedSettings.hotkeys, null, 2));

const expectedHotkey = 'Cmd+3';
const actualHotkey = savedSettings.hotkeys ? savedSettings.hotkeys['toggle-toolbar'] : undefined;
console.log('Expected toggle-toolbar hotkey:', expectedHotkey);
console.log('Actual toggle-toolbar hotkey:', actualHotkey);

if (actualHotkey === expectedHotkey) {
  console.log('✅ SUCCESS: Hotkey was saved correctly!');
} else {
  console.log('❌ BUG REPRODUCED: Hotkey was NOT saved correctly!');
  console.log('This confirms the hotkey save bug exists.');
}

console.log('');
console.log('=== TEST COMPLETE ===');

// Additional debugging: Check if the issue is in the data flow
console.log('');
console.log('=== ADDITIONAL DEBUGGING ===');
console.log('Checking data flow integrity...');

// Check if the issue is in the merging process
const testMerge = {
  ...formValues,
  hotkeys: modifiedHotkeys
};
console.log('Test merge result:', JSON.stringify(testMerge, null, 2));
console.log('Hotkeys in test merge:', JSON.stringify(testMerge.hotkeys, null, 2));

// Check if the issue is in JSON serialization
const testJson = JSON.stringify(testMerge);
console.log('Test JSON serialization:', testJson);
const testParse = JSON.parse(testJson);
console.log('Test JSON parse result:', JSON.stringify(testParse, null, 2));
console.log('Hotkeys after JSON round-trip:', JSON.stringify(testParse.hotkeys, null, 2));

console.log('=== DEBUGGING COMPLETE ===');