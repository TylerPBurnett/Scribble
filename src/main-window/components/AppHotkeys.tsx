import { useEffect } from 'react';
import { AppSettings } from '../../shared/services/settingsService';
import { useAppHotkeysV2 } from '../../shared/hooks/useAppHotkeysV2';
// import { HotkeyAction } from '../../shared/services/hotkeyService';

interface AppHotkeysProps {
  settings: AppSettings;
  onNewNote: () => void;
  onOpenSettings: () => void;
  onSearch: () => void;
  onToggleDarkMode: () => void;
}

/**
 * Component that registers global application hotkeys
 */
export function AppHotkeys({
  settings,
  onNewNote,
  onOpenSettings,
  onSearch,
  onToggleDarkMode,
}: AppHotkeysProps) {
  // Log available hotkeys when settings change
  useEffect(() => {
    const hotkeys = settings.hotkeys || {};
    console.log('AppHotkeys - Settings changed, hotkeys:', Object.entries(hotkeys)
      .map(([action, key]) => `${action}: ${key}`)
      .join(', ')
    );
  }, [settings]);

  // Register global hotkeys
  useAppHotkeysV2(
    settings,
    {
      newNote: onNewNote,
      openSettings: onOpenSettings,
      search: onSearch,
      toggleDarkMode: onToggleDarkMode,
    },
    {
      // Enable hotkeys in form elements
      enableOnFormTags: true,
    }
  );

  // This component doesn't render anything
  return null;
}
