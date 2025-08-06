import { useState, useEffect, useRef, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { HotkeyAction, formatHotkeyForDisplay } from '../../shared/services/hotkeyService';
import { ThemeName } from '../../shared/services/themeService';

interface HotkeyEditorProps {
  action: HotkeyAction;
  label: string;
  currentValue: string;
  onChange: (action: HotkeyAction, value: string) => void;
  theme?: ThemeName;
}

export function HotkeyEditor({ action, label, currentValue, onChange, theme = 'dim' }: HotkeyEditorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [displayValue, setDisplayValue] = useState(formatHotkeyForDisplay(currentValue));
  const inputRef = useRef<HTMLInputElement>(null);

  // Update display value when currentValue changes
  useEffect(() => {
    setDisplayValue(formatHotkeyForDisplay(currentValue));
  }, [currentValue]);

  // Start recording when the input is focused
  const handleFocus = () => {
    setIsRecording(true);
    setDisplayValue('Press keys...');
  };

  // Stop recording when the input is blurred
  const handleBlur = () => {
    setIsRecording(false);
    setDisplayValue(formatHotkeyForDisplay(currentValue));
  };

  // Handle key down events to record hotkeys
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) return;

    e.preventDefault();

    // Don't process if it's only a modifier key being pressed
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return;
    }

    // Get the key combination
    const keys: string[] = [];
    
    // Use 'mod' for cross-platform compatibility (Cmd on Mac, Ctrl on Windows/Linux)
    // This matches the format expected by react-hotkeys-hook
    if (e.metaKey || e.ctrlKey) {
      keys.push('mod');
    } else {
      // Only add individual modifiers if mod isn't already added
      if (e.ctrlKey) keys.push('ctrl');
    }
    
    if (e.altKey) keys.push('alt');
    if (e.shiftKey) keys.push('shift');

    // Add the actual key (not a modifier) - use e.code to get the physical key
    // Convert KeyT -> t, KeyA -> a, etc.
    let physicalKey = e.code;
    if (physicalKey.startsWith('Key')) {
      physicalKey = physicalKey.slice(3).toLowerCase();
    } else if (physicalKey.startsWith('Digit')) {
      physicalKey = physicalKey.slice(5);
    } else {
      // For other keys like Space, Enter, etc., use the key value but fallback to code
      physicalKey = e.key.length === 1 ? e.key.toLowerCase() : e.code;
    }
    keys.push(physicalKey);

    // Update the value
    const newValue = keys.join('+');
    onChange(action, newValue);
    setDisplayValue(formatHotkeyForDisplay(newValue));
    setIsRecording(false);
    inputRef.current?.blur();
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
    onChange(action, '');
    setDisplayValue('');
  };

  return (
    <div className={`flex items-center justify-between py-3 border-b last:border-0 ${theme === 'light' ? 'border-gray-200' : 'border-border/30'}`}>
      <div className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-foreground'}`}>{label}</div>
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
