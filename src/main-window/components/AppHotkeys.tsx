import { useEffect } from 'react';
import { AppSettings } from '../../shared/services/settingsService';
import { useAppHotkeys } from '../../shared/hooks/useAppHotkeys';
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
  // Register global hotkeys
  useAppHotkeys(
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

  // Log available hotkeys on mount
  useEffect(() => {
    const hotkeys = settings.hotkeys || {};
    console.log('Available hotkeys:', Object.entries(hotkeys)
      .map(([action, key]) => `${action}: ${key}`)
      .join(', ')
    );
  }, [settings.hotkeys]);

  // This component doesn't render anything
  return null;
}
