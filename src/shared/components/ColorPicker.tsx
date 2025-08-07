import React, { useRef, useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { NOTE_COLOR_OPTIONS, NoteColorOption } from '../constants/colors';

interface ColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
  currentColor?: string;
  title?: string;
  colorOptions?: NoteColorOption[];
  className?: string;
}

/**
 * Advanced color picker component with react-colorful
 * Features: True color picker, favorites, presets
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  isOpen,
  onClose,
  onColorSelect,
  currentColor = '#fff9c4',
  title = 'Note Color',
  colorOptions = NOTE_COLOR_OPTIONS,
  className = ''
}) => {
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [favoriteColors, setFavoriteColors] = useState<string[]>(() => {
    // Load favorite colors from localStorage
    const saved = localStorage.getItem('scribble-favorite-colors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Update selected color when currentColor prop changes
  useEffect(() => {
    setSelectedColor(currentColor);
  }, [currentColor]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Save favorite colors to localStorage
  useEffect(() => {
    if (favoriteColors.length > 0) {
      localStorage.setItem('scribble-favorite-colors', JSON.stringify(favoriteColors));
    }
  }, [favoriteColors]);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };

  const handleApply = () => {
    onColorSelect(selectedColor);
    onClose();
  };

  const addToFavorites = () => {
    if (!favoriteColors.includes(selectedColor)) {
      // Keep only the last 6 favorite colors (3x2 grid)
      const newFavorites = [selectedColor, ...favoriteColors].slice(0, 6);
      setFavoriteColors(newFavorites);
    }
  };

  const removeFavorite = (color: string) => {
    setFavoriteColors(favoriteColors.filter(c => c !== color));
  };

  if (!isOpen) return null;

  return (
    <div
      ref={colorPickerRef}
      className={`absolute inset-0 z-20 flex items-center justify-center rounded-xl overflow-hidden ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="relative bg-gradient-to-b from-popover to-popover/95 rounded-lg shadow-2xl overflow-visible w-[90%] max-w-[260px] border border-white/10"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
          animation: 'slideUp 0.2s ease-out'
        }}
      >
        {/* Close button positioned absolutely */}
        <button
          className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-popover border border-white/20 text-text-tertiary hover:text-text hover:bg-danger hover:border-danger transition-all duration-200 flex items-center justify-center shadow-lg"
          onClick={onClose}
          aria-label="Close color picker"
        >
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6L18 18" />
          </svg>
        </button>

        {/* Horizontal layout container - reduced padding */}
        <div className="flex p-2 gap-1.5 pb-8">
          {/* Left side: Preview, hex, and picker */}
          <div className="flex flex-col gap-1.5">
            {/* Color preview and hex input */}
            <div className="flex items-center gap-2">
              <div 
                className="w-7 h-7 rounded border border-white/20 shadow-inner flex-shrink-0"
                style={{ backgroundColor: selectedColor }}
              />
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                    setSelectedColor(value);
                  }
                }}
                className="w-[95px] px-2 py-0.5 text-[10px] rounded border border-white/10 bg-black/20 text-text focus:outline-none focus:border-primary/50 font-mono"
                placeholder="#000000"
              />
            </div>
            
            {/* Color picker */}
            <div className="color-picker-wrapper rounded overflow-hidden">
              <HexColorPicker 
                color={selectedColor} 
                onChange={handleColorChange}
                style={{ width: '135px', height: '95px' }}
              />
            </div>
          </div>

          {/* Right side: Presets and favorites */}
          <div className="flex-1 flex flex-col gap-1.5">
            {/* Quick preset colors */}
            <div>
              <div className="text-[9px] text-text-tertiary mb-0.5 font-medium">Presets</div>
              <div className="grid grid-cols-3 gap-0.5">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    className={`
                      w-4 h-4 rounded-full transition-all duration-200
                      ${selectedColor === color.value
                        ? 'ring-2 ring-primary ring-offset-1 ring-offset-popover'
                        : 'hover:scale-110 border border-white/20'
                    }
                  `}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    onClick={() => setSelectedColor(color.value)}
                  />
                ))}
              </div>
            </div>

            {/* Favorites section */}
            <div>
              <div className="text-[9px] text-text-tertiary mb-0.5 font-medium flex items-center justify-between">
                <span>Favorites</span>
                {favoriteColors.length > 0 && (
                  <button
                    onClick={() => setFavoriteColors([])}
                    className="text-[8px] hover:text-danger transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {favoriteColors.map((color, index) => (
                  <div 
                    key={`${color}-${index}`} 
                    className="relative group"
                    style={{ position: 'relative', width: '16px', height: '16px' }}
                  >
                    <button
                      className={`
                        w-4 h-4 rounded-full transition-all duration-200
                        ${selectedColor === color
                          ? 'ring-2 ring-primary ring-offset-1 ring-offset-popover'
                          : 'hover:scale-110 border border-white/20'
                        }
                      `}
                      style={{ backgroundColor: color }}
                      title={color}
                      onClick={() => setSelectedColor(color)}
                    />
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        left: '10px',
                        width: '7px',
                        height: '7px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 999,
                        fontSize: '5px',
                        lineHeight: '1',
                        color: 'white',
                        fontWeight: 'bold',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(color);
                      }}
                      title="Remove"
                    >
                      ×
                    </div>
                  </div>
                ))}
                {/* Empty slots for favorites */}
                {Array.from({ length: Math.max(0, 6 - favoriteColors.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-4 h-4 rounded-full border border-dashed border-white/10"
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
        
        {/* Action buttons positioned absolutely in bottom right */}
        <div className="absolute bottom-2 right-2 flex gap-1.5">
          <button
            onClick={addToFavorites}
            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-text-secondary hover:text-text transition-all duration-200 flex items-center justify-center"
            title="Save to favorites"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button
            onClick={handleApply}
            className="w-6 h-6 rounded bg-primary hover:bg-primary/90 text-white transition-all duration-200 flex items-center justify-center"
            title="Apply color"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
