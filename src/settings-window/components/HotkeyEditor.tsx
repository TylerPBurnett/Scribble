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
    if (e.ctrlKey) keys.push('ctrl');
    if (e.altKey) keys.push('alt');
    if (e.shiftKey) keys.push('shift');
    if (e.metaKey) keys.push('meta');

    // Add the actual key (not a modifier)
    keys.push(e.key.toLowerCase());

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
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className={`text-sm font-medium ${theme === 'light' ? 'text-black' : 'text-foreground'}`}>{label}</div>
      <div className="flex items-center gap-2">
        <div
          className={`
            px-4 py-2 rounded-md border bg-secondary
            text-sm font-mono cursor-pointer min-w-[150px] text-center shadow-sm
            ${isRecording
              ? 'border-primary text-primary ring-1 ring-primary/30'
              : `border-border/50 hover:border-border hover:bg-secondary ${theme === 'light' ? 'text-black' : 'text-secondary-foreground'}`}
            transition-colors duration-200
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
          <span className={theme === 'light' ? 'text-black' : ''}>{displayValue || 'Not set'}</span>
        </div>
        {currentValue && (
          <button
            className="text-muted-foreground hover:text-foreground transition-colors duration-200 p-1.5 rounded-full hover:bg-secondary active:scale-95 shadow-sm border border-transparent hover:border-border/50"
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
