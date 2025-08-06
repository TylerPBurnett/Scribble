import { useEffect, useRef } from 'react';
import { useHotkeys, Options } from 'react-hotkeys-hook';
import { AppSettings } from '../services/settingsService';
import { getHotkeys, HotkeyAction } from '../services/hotkeyService';

/**
 * Improved hook to register application hotkeys that properly handles updates
 * 
 * @param settings The application settings containing hotkey configurations
 * @param actions Object mapping hotkey actions to handler functions
 * @param options Additional options for hotkey registration
 */
export const useAppHotkeysV2 = (
  settings: AppSettings,
  actions: Partial<Record<HotkeyAction, () => void>>,
  options: Options = {}
) => {
  const hotkeys = getHotkeys(settings);
  
  // Track previous hotkeys to detect changes
  const prevHotkeysRef = useRef<Record<string, string>>({});
  
  // Default options
  const defaultOptions: Options = {
    enableOnFormTags: false,
    enableOnContentEditable: false,
    enabled: true,
    ...options
  };
  
  useEffect(() => {
    console.log('useAppHotkeysV2 - Settings changed, re-evaluating hotkeys');
    
    // Check if hotkeys have changed
    const currentHotkeys: Record<string, string> = {};
    Object.entries(actions).forEach(([action, handler]) => {
      if (handler) {
        const hotkey = hotkeys[action as HotkeyAction];
        if (hotkey) {
          currentHotkeys[action] = hotkey;
        }
      }
    });
    
    // Log the changes
    const prev = prevHotkeysRef.current;
    Object.keys(currentHotkeys).forEach(action => {
      if (prev[action] !== currentHotkeys[action]) {
        console.log(`Hotkey changed for ${action}: ${prev[action] || 'none'} -> ${currentHotkeys[action]}`);
      }
    });
    
    prevHotkeysRef.current = currentHotkeys;
  }, [settings, actions, hotkeys]);
  
  // Register each hotkey individually
  // The key here is that we're creating new hook calls when settings change
  Object.entries(actions).forEach(([action, handler]) => {
    const hotkey = hotkeys[action as HotkeyAction];
    
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHotkeys(
      hotkey || '', 
      (event) => {
        if (hotkey && handler) {
          event.preventDefault();
          console.log(`Hotkey triggered: ${action} (${hotkey})`);
          handler();
        }
      }, 
      defaultOptions,
      [hotkey, handler] // Dependencies ensure re-registration when hotkey changes
    );
  });
};
