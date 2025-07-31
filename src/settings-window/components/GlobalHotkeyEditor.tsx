import { useState, useEffect, useRef, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { formatHotkeyForDisplay } from '../../shared/services/hotkeyService';
import { ThemeName } from '../../shared/services/themeService';

interface GlobalHotkeyEditorProps {
  label: string;
  description: string;
  currentValue: string;
  onChange: (value: string) => void;
  theme?: ThemeName;
}

export function GlobalHotkeyEditor({
  label,
  description,
  currentValue,
  onChange,
  theme = 'dim'
}: GlobalHotkeyEditorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [displayValue, setDisplayValue] = useState(formatHotkeyForDisplay(currentValue));
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Update display value when currentValue changes
  useEffect(() => {
    setDisplayValue(formatHotkeyForDisplay(currentValue));
  }, [currentValue]);

  // Start recording when the input is focused
  const handleFocus = () => {
    setIsRecording(true);
    setPressedKeys(new Set());
    setDisplayValue('Press keys...');
  };

  // Stop recording when the input is blurred
  const handleBlur = () => {
    setIsRecording(false);
    setPressedKeys(new Set());
    setDisplayValue(formatHotkeyForDisplay(currentValue));
  };

  // Handle key down events to record hotkeys
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) return;

    e.preventDefault();

    // Track pressed keys
    const newPressedKeys = new Set(pressedKeys);

    // Add modifiers - use Electron's accelerator format
    // https://www.electronjs.org/docs/latest/api/accelerator

    // CommandOrControl is a special value in Electron that maps to Command on macOS and Control on Windows/Linux
    if (e.metaKey || e.ctrlKey) newPressedKeys.add('CommandOrControl');

    // Add other modifiers
    if (e.altKey) newPressedKeys.add('Alt');
    if (e.shiftKey) newPressedKeys.add('Shift');

    // Add the key if it's not a modifier key press
    if (!['Control', 'Alt', 'Shift', 'Meta', 'Command'].includes(e.key)) {
      // Convert key to proper format for Electron accelerators
      let key = e.key;

      // Log the actual key code for debugging
      console.log('Key pressed:', e.key, 'Key code:', e.code);

      // Handle special keys
      if (key === ' ') key = 'Space';
      else if (key === 'ArrowUp') key = 'Up';
      else if (key === 'ArrowDown') key = 'Down';
      else if (key === 'ArrowLeft') key = 'Left';
      else if (key === 'ArrowRight') key = 'Right';
      else if (key === 'Escape') key = 'Esc';
      // Use key code for letter keys to ensure correct mapping
      else if (e.code && e.code.startsWith('Key')) {
        key = e.code.replace('Key', '');
      }
      // For other keys, just use uppercase
      else if (key.length === 1) {
        key = key.toUpperCase();
      }

      newPressedKeys.add(key);
    }

    // Update the display with current pressed keys
    const keysArray = Array.from(newPressedKeys);
    setDisplayValue(formatHotkeyForDisplay(keysArray.join('+')));
    setPressedKeys(newPressedKeys);
  };

  // Handle key up events to finalize hotkey
  const handleKeyUp = () => {
    if (!isRecording) return;

    // If we have at least one non-modifier key, finalize the hotkey
    const nonModifierKeys = Array.from(pressedKeys).filter(key =>
      !['Command', 'Control', 'Alt', 'Shift', 'Meta'].includes(key)
    );

    if (nonModifierKeys.length > 0) {
      // Finalize the hotkey - convert to Electron accelerator format
      const keysArray = Array.from(pressedKeys);

      // Convert Command/Control to CommandOrControl for cross-platform compatibility
      // and sort keys to ensure modifiers come first
      const modifiers = ['CommandOrControl', 'Alt', 'Shift', 'Meta', 'Command', 'Control'];

      // First map Command/Control to CommandOrControl
      let mappedKeys = keysArray.map(key => {
        if (key === 'Command' || key === 'Control') return 'CommandOrControl';
        return key;
      });

      // Remove duplicates (in case both Command and Control were pressed)
      mappedKeys = [...new Set(mappedKeys)];

      // Then sort so modifiers come first
      mappedKeys.sort((a, b) => {
        const aIndex = modifiers.indexOf(a);
        const bIndex = modifiers.indexOf(b);

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      });

      // Log the mapping process for debugging
      console.log('Hotkey mapping process:', {
        original: keysArray,
        afterMapping: mappedKeys
      });

      const newValue = mappedKeys.join('+');
      console.log('Final hotkey value:', newValue);

      // Call onChange to update the parent component
      onChange(newValue);

      // Log the new hotkey value for debugging
      console.log('New hotkey value set:', newValue);

      // Ensure settings are updated after the state has been fully updated
      setTimeout(() => {
        console.log('Forcing immediate update of hotkeys in main process');
        window.settings.settingsUpdated();
      }, 0);

      // End recording
      setIsRecording(false);
      setPressedKeys(new Set());
      inputRef.current?.blur();
    }
  };

  // Handle click to focus the input
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.focus();
  };

  // Handle clear button click
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setDisplayValue('');
  };

  return (
    <div className={`flex flex-row items-center justify-between rounded-lg border p-5 ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'backdrop-blur-sm border-border/30 bg-black/20'}`}>
      <div className={description ? "space-y-2" : ""}>
        <div className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>{label}</div>
        {description && (
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-muted-foreground'}`}>
            {description}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`
            px-3 py-1.5 rounded-md border text-sm font-mono cursor-pointer min-w-[120px] text-center shadow-sm transition-colors duration-200
            ${isRecording
              ? (theme === 'light' 
                  ? 'border-blue-500 text-blue-700 ring-1 ring-blue-500/30 bg-blue-50' 
                  : 'border-primary text-primary ring-1 ring-primary/30 bg-secondary')
              : (theme === 'light'
                  ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white text-gray-900'
                  : 'border-border/50 hover:border-border hover:bg-secondary bg-secondary text-secondary-foreground')}
          `}
          onClick={handleClick}
        >
          <input
            ref={inputRef}
            type="text"
            className="sr-only"
            value={displayValue}
            onChange={() => {}}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
          />
          <span>{displayValue || 'Not set'}</span>
        </div>
        {currentValue && (
          <button
            className={`transition-colors duration-200 p-1.5 rounded-full active:scale-95 shadow-sm border border-transparent ${theme === 'light' ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 hover:border-gray-200' : 'text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border/50'}`}
            onClick={handleClear}
            title="Clear hotkey"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
