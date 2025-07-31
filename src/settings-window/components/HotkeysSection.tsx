import { useState } from 'react';
import {
  HotkeyAction,
  HOTKEY_CATEGORIES,
  HOTKEY_LABELS
} from '../../shared/services/hotkeyService';
import { ThemeName } from '../../shared/services/themeService';
import { HotkeyEditor } from './HotkeyEditor';

interface HotkeysSectionProps {
  hotkeys: Record<HotkeyAction, string>;
  onChange: (hotkeys: Record<HotkeyAction, string>) => void;
  theme?: ThemeName;
}

export function HotkeysSection({ hotkeys, onChange, theme = 'dim' }: HotkeysSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(HOTKEY_CATEGORIES)[0]);

  // Handle hotkey change
  const handleHotkeyChange = (action: HotkeyAction, value: string) => {
    onChange({
      ...hotkeys,
      [action]: value
    });
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Category tabs */}
        <div className="w-full md:w-1/4">
          <div className={`flex flex-col space-y-2 rounded-lg p-2 border ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'backdrop-blur-sm border-border/30 bg-black/20'}`}>
            {Object.entries(HOTKEY_CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                className={`
                  text-left px-4 py-3 rounded-md text-sm transition-colors duration-200 border
                  ${activeCategory === key
                    ? (theme === 'light'
                      ? 'bg-blue-50 text-blue-700 font-medium border-blue-200 shadow-sm'
                      : 'bg-primary/10 text-primary font-medium border-primary/30 shadow-sm')
                    : (theme === 'light'
                      ? 'hover:bg-gray-50 text-gray-600 border-transparent hover:border-gray-200'
                      : 'hover:bg-secondary/50 text-muted-foreground border-transparent hover:border-border/50')}
                `}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveCategory(key);
                }}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>

        {/* Hotkey editors */}
        <div className={`w-full md:w-3/4 rounded-lg p-5 border ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'backdrop-blur-sm border-border/30 bg-black/20'}`}>
          <div className="space-y-3">
            {HOTKEY_CATEGORIES[activeCategory as keyof typeof HOTKEY_CATEGORIES]?.actions.map((action) => (
              <HotkeyEditor
                key={action}
                action={action}
                label={HOTKEY_LABELS[action]}
                currentValue={hotkeys[action]}
                onChange={handleHotkeyChange}
                theme={theme}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
