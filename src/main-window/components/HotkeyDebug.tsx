import { useEffect } from 'react';
import { AppSettings } from '../../shared/services/settingsService';
import { getHotkeys } from '../../shared/services/hotkeyService';

interface HotkeyDebugProps {
  settings: AppSettings;
}

export function HotkeyDebug({ settings }: HotkeyDebugProps) {
  useEffect(() => {
    const hotkeys = getHotkeys(settings);
    console.log('=== HOTKEY DEBUG ===');
    console.log('Current settings:', settings);
    console.log('Hotkeys from settings:', settings.hotkeys);
    console.log('Computed hotkeys:', hotkeys);
    console.log('Individual hotkeys:');
    console.log('  - Search (Command Palette):', hotkeys.search);
    console.log('  - Open Settings:', hotkeys.openSettings);
    console.log('  - New Note:', hotkeys.newNote);
    console.log('  - Toggle Dark Mode:', hotkeys.toggleDarkMode);
    
    // Check localStorage directly
    const localStorageSettings = localStorage.getItem('app_settings');
    if (localStorageSettings) {
      try {
        const parsed = JSON.parse(localStorageSettings);
        console.log('Settings in localStorage:', parsed);
        console.log('Hotkeys in localStorage:', parsed.hotkeys);
      } catch (e) {
        console.error('Failed to parse localStorage settings:', e);
      }
    } else {
      console.log('No settings found in localStorage');
    }
    
    console.log('===================');
  }, [settings]);

  return null;
}
