#!/usr/bin/env node

/**
 * Test script to reproduce the real hotkey save bug
 * This script tests the actual application flow by simulating browser localStorage
 */

console.log('=== REAL HOTKEY SAVE BUG TEST ===');
console.log('Testing the actual hotkey save flow with real data structures');
console.log('');

// Simulate browser localStorage
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

// Real DEFAULT_HOTKEYS from the application
const DEFAULT_HOTKEYS = {
  newNote: 'ctrl+n',
  openSettings: 'ctrl+,',
  search: 'ctrl+f',
  toggleDarkMode: 'ctrl+shift+d',
  saveNote: 'ctrl+s',
  pinNote: 'ctrl+p',
  deleteNote: 'ctrl+delete',
  changeColor: 'ctrl+shift+c',
  toggleBold: 'ctrl+b',
  toggleItalic: 'ctrl+i',
  toggleUnderline: 'ctrl+u',
  toggleHighlight: 'ctrl+h',
  toggleHeading1: 'ctrl+1',
  toggleHeading2: 'ctrl+2',
  toggleBulletList: 'ctrl+shift+8',
  toggleOrderedList: 'ctrl+shift+9',
  toggleTaskList: 'ctrl+shift+t',
  toggleToolbar: 'alt+t',
};

// Real DEFAULT_SETTINGS from the application
const DEFAULT_SETTINGS = {
  saveLocation: '',
  autoSave: true,
  autoSaveInterval: 5,
  theme: 'dim',
  hotkeys: DEFAULT_HOTKEYS,
  autoLaunch: false,
  minimizeToTray: true,
  globalHotkeys: {
    newNote: 'CommandOrControl+Alt+N',
    toggleApp: 'CommandOrControl+Alt+S'
  },
  notesSortOption: {
    label: 'Title (A-Z)',
    field: 'title',
    direction: 'asc'
  }
};

// Simulate the real getSettings function
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

// Helper function to migrate global hotkeys
function migrateGlobalHotkeys(hk) {
  const result = { ...hk };
  if (result.showApp && !result.toggleApp) {
    result.toggleApp = result.showApp;
    console.log('Migrated from showApp to toggleApp (canonical property)');
  }
  return result;
}

// Simulate the real saveSettings function with all the complexity
function saveSettings(settings) {
  console.log('=== HOTKEY SAVE DEBUG: saveSettings started ===');
  console.log('Settings received in saveSettings:', JSON.stringify(settings, null, 2));
  console.log('Hotkeys property in received settings:', JSON.stringify(settings.hotkeys, null, 2));
  console.log('Type of hotkeys property:', typeof settings.hotkeys);
  console.log('Is hotkeys property defined?', settings.hotkeys !== undefined);
  console.log('Is hotkeys property null?', settings.hotkeys === null);
  console.log('Number of hotkey entries:', settings.hotkeys ? Object.keys(settings.hotkeys).length : 0);

  // Ensure globalHotkeys is properly set (from real code)
  if (!settings.globalHotkeys) {
    settings = {
      ...settings,
      globalHotkeys: {
        newNote: DEFAULT_SETTINGS.globalHotkeys.newNote,
        toggleApp: DEFAULT_SETTINGS.globalHotkeys.toggleApp
      }
    };
    console.log('Added default global hotkeys to settings');
  } else {
    settings.globalHotkeys = migrateGlobalHotkeys(settings.globalHotkeys);
  }

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

// Simulate the real SettingsDialog onSubmit function
function simulateOnSubmit(formValues, hotkeys, initialSettings) {
  console.log('=== HOTKEY SAVE DEBUG: onSubmit started ===');
  console.log('Form values received:', JSON.stringify(formValues, null, 2));
  console.log('Current hotkeys state:', JSON.stringify(hotkeys, null, 2));
  console.log('Initial settings hotkeys:', JSON.stringify(initialSettings.hotkeys, null, 2));
  
  // Combine form values with hotkeys (this is the exact code from SettingsDialog.tsx)
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

  // Ensure both toggleApp and showApp properties are set for backward compatibility
  if (combinedSettings.globalHotkeys) {
    console.log('Processing globalHotkeys for backward compatibility');
    if (combinedSettings.globalHotkeys.toggleApp && !combinedSettings.globalHotkeys.showApp) {
      combinedSettings.globalHotkeys.showApp = combinedSettings.globalHotkeys.toggleApp;
      console.log('Set showApp from toggleApp:', combinedSettings.globalHotkeys.showApp);
    } else if (combinedSettings.globalHotkeys.showApp && !combinedSettings.globalHotkeys.toggleApp) {
      combinedSettings.globalHotkeys.toggleApp = combinedSettings.globalHotkeys.showApp;
      console.log('Set toggleApp from showApp:', combinedSettings.globalHotkeys.toggleApp);
    }
  }

  console.log('Final combined settings before save:', JSON.stringify(combinedSettings, null, 2));

  // Simulate the SettingsApp handleSaveSettings function
  console.log('SettingsApp - Saving new settings:', combinedSettings);
  const saveResult = saveSettings(combinedSettings);
  console.log('SettingsApp - Settings saved, result:', saveResult);
  
  console.log('=== HOTKEY SAVE DEBUG: onSubmit completed ===');
  return saveResult;
}

// Test scenario: User changes "Toggle editor toolbar" from alt+t to cmd+3
console.log('=== TEST SCENARIO ===');
console.log('User changes "Toggle editor toolbar" from alt+t to cmd+3');
console.log('');

// Step 1: Initialize with existing settings (simulate app startup)
console.log('Step 1: Simulating app initialization...');
// First, let's put some existing settings in localStorage to simulate a real scenario
const existingSettings = {
  ...DEFAULT_SETTINGS,
  saveLocation: '/Users/test/Documents/Notes',
  theme: 'dark'
};
localStorage.setItem('app_settings', JSON.stringify(existingSettings));
console.log('Pre-existing settings in localStorage:', JSON.stringify(existingSettings, null, 2));

const initialSettings = getSettings();
console.log('Initial settings loaded:', JSON.stringify(initialSettings, null, 2));
console.log('Initial hotkeys:', JSON.stringify(initialSettings.hotkeys, null, 2));
console.log('');

// Step 2: Simulate user changing hotkey in the UI
console.log('Step 2: User changes toggleToolbar hotkey from alt+t to cmd+3...');
const modifiedHotkeys = {
  ...initialSettings.hotkeys,
  'toggleToolbar': 'cmd+3'  // User changed this
};
console.log('Modified hotkeys:', JSON.stringify(modifiedHotkeys, null, 2));
console.log('');

// Step 3: Simulate form values (what react-hook-form would provide)
console.log('Step 3: Preparing form values (from react-hook-form)...');
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
const saveSuccess = simulateOnSubmit(formValues, modifiedHotkeys, initialSettings);
console.log('');

// Step 5: Verify the bug - check if hotkeys were actually saved
console.log('Step 5: Verifying if hotkeys were saved correctly...');
const savedSettings = getSettings();
console.log('Settings after save:', JSON.stringify(savedSettings, null, 2));
console.log('Hotkeys after save:', JSON.stringify(savedSettings.hotkeys, null, 2));

const expectedHotkey = 'cmd+3';
const actualHotkey = savedSettings.hotkeys ? savedSettings.hotkeys['toggleToolbar'] : undefined;
console.log('Expected toggleToolbar hotkey:', expectedHotkey);
console.log('Actual toggleToolbar hotkey:', actualHotkey);

if (actualHotkey === expectedHotkey) {
  console.log('✅ SUCCESS: Hotkey was saved correctly!');
} else {
  console.log('❌ BUG REPRODUCED: Hotkey was NOT saved correctly!');
  console.log('This confirms the hotkey save bug exists.');
}

console.log('');
console.log('=== TEST COMPLETE ===');

// Step 6: Test reopening settings to see if hotkeys persist
console.log('');
console.log('Step 6: Testing settings persistence (simulating reopening settings)...');
// Don't clear localStorage data - we want to test if the settings persisted
console.log('Current localStorage data:', JSON.stringify(localStorage.data, null, 2));

const reopenedSettings = getSettings();
console.log('Settings when reopened:', JSON.stringify(reopenedSettings, null, 2));
console.log('Hotkeys when reopened:', JSON.stringify(reopenedSettings.hotkeys, null, 2));

const reopenedHotkey = reopenedSettings.hotkeys ? reopenedSettings.hotkeys['toggleToolbar'] : undefined;
console.log('toggleToolbar hotkey when reopened:', reopenedHotkey);

if (reopenedHotkey === expectedHotkey) {
  console.log('✅ PERSISTENCE SUCCESS: Hotkey persisted correctly!');
} else {
  console.log('❌ PERSISTENCE BUG: Hotkey did NOT persist correctly!');
}

console.log('');
console.log('=== FULL TEST COMPLETE ===');