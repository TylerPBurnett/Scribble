import { useHotkeys } from 'react-hotkeys-hook';
import { useCallback, useEffect, useRef } from 'react';
import { AppSettings } from '../services/settingsService';
import { getHotkeys, HotkeyAction } from '../services/hotkeyService';

/**
 * Hook to register application hotkeys
 * 
 * @param settings The application settings containing hotkey configurations
 * @param actions Object mapping hotkey actions to handler functions
 * @param options Additional options for hotkey registration
 */
export const useAppHotkeys = (
  settings: AppSettings,
  actions: Partial<Record<HotkeyAction, () => void>>,
  options: {
    enableOnFormTags?: boolean;
    enableOnContentEditable?: boolean;
    enabled?: boolean;
  } = {}
) => {
  const hotkeys = getHotkeys(settings);
  
  // Default options
  const defaultOptions = {
    enableOnFormTags: false,
    enableOnContentEditable: false,
    enabled: true,
    ...options
  };
  
  // Register each hotkey
  Object.entries(actions).forEach(([action, handler]) => {
    const hotkey = hotkeys[action as HotkeyAction];
    if (hotkey && handler) {
      useHotkeys(
        hotkey, 
        (event) => {
          event.preventDefault();
          handler();
        }, 
        {
          enableOnFormTags: defaultOptions.enableOnFormTags,
          enableOnContentEditable: defaultOptions.enableOnContentEditable,
          enabled: defaultOptions.enabled,
        },
        [handler, hotkey] // Add hotkey as dependency so it updates when changed
      );
    }
  });
};

/**
 * Hook to register a single hotkey
 * 
 * @param settings The application settings containing hotkey configurations
 * @param action The hotkey action to register
 * @param handler The function to call when the hotkey is pressed
 * @param options Additional options for hotkey registration
 */
export const useAppHotkey = (
  settings: AppSettings,
  action: HotkeyAction,
  handler: () => void,
  options: {
    enableOnFormTags?: boolean;
    enableOnContentEditable?: boolean;
    enabled?: boolean;
  } = {}
) => {
  const callback = useCallback(handler, [handler]);
  
  useAppHotkeys(
    settings,
    { [action]: callback },
    options
  );
};
