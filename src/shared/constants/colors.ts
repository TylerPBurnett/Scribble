/**
 * Shared color constants for note backgrounds
 */

export interface NoteColorOption {
  name: string;
  value: string;
  textColor?: string; // Optional text color for better contrast
}

export const NOTE_COLOR_OPTIONS: NoteColorOption[] = [
  { name: 'Light Gray', value: '#F9FAFB', textColor: '#333333' }, // Light theme default
  { name: 'Yellow', value: '#fff9c4', textColor: '#333333' },
  { name: 'White', value: '#ffffff', textColor: '#333333' },
  { name: 'Black', value: '#333333', textColor: '#ffffff' },
  { name: 'Dim Gray', value: '#44475a', textColor: '#f8f8f2' }, // Dim theme default
  { name: 'Dark Gray', value: '#2d2d2d', textColor: '#ffffff' }, // Dark theme default
  { name: 'Pastel Green', value: '#d0f0c0', textColor: '#333333' },
  { name: 'Pastel Blue', value: '#b5d8eb', textColor: '#333333' },
  { name: 'Pastel Purple', value: '#d8c2ef', textColor: '#333333' },
  { name: 'Pastel Pink', value: '#f4c2c2', textColor: '#333333' },
  { name: 'Pastel Gray', value: '#d3d3d3', textColor: '#333333' }
];

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate the relative luminance of a color
 * Based on WCAG 2.1 guidelines
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Determine if a color is light or dark based on its luminance
 */
function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true; // Default to light if we can't parse
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const isLight = luminance > 0.5; // Threshold for light vs dark
  
  console.log('isLightColor calculation:', {
    hex,
    rgb,
    luminance,
    isLight,
    threshold: 0.5
  });
  
  return isLight;
}

/**
 * Get the appropriate text color for a given background color
 * Works with any hex color, not just predefined ones
 */
export function getTextColorForBackground(backgroundColor: string): string {
  console.log('getTextColorForBackground called with:', backgroundColor);
  
  // First check if it's a predefined color with a specific text color
  const colorOption = NOTE_COLOR_OPTIONS.find(option => option.value === backgroundColor);
  if (colorOption?.textColor) {
    console.log('Found predefined color:', colorOption);
    return colorOption.textColor;
  }
  
  // For any other color, calculate based on luminance
  const isLight = isLightColor(backgroundColor);
  const textColor = isLight ? '#333333' : '#ffffff'; // Dark text on light bg, light text on dark bg
  
  console.log('Dynamic color calculation result:', {
    backgroundColor,
    isLight,
    textColor
  });
  
  return textColor;
}

/**
 * Get theme-aware default note color
 */
export function getDefaultNoteColorForTheme(theme: string): string {
  switch (theme) {
    case 'light':
      return '#F9FAFB'; // Light gray - matches main app note list
    case 'dim':
      return '#44475a'; // Muted purple-gray - harmonizes with dim theme
    case 'dark':
      return '#2d2d2d'; // Dark gray - subtle contrast with dark theme
    default:
      return '#F9FAFB'; // Fallback to light gray
  }
}

/**
 * Get color style configuration for a note
 */
export function getNoteColorStyle(noteColor?: string) {
  if (!noteColor) {
    // Default styling using CSS variables
    return {
      backgroundColor: 'hsl(var(--card))',
      color: 'hsl(var(--card-foreground))',
      headerBg: '',
      footerBg: '',
      cssVars: {}
    };
  }

  const textColor = getTextColorForBackground(noteColor);
  
  // Create CSS custom properties for consistent color application
  const cssVars = {
    '--note-bg-color': noteColor,
    '--note-text-color': textColor,
    '--note-text-secondary': `${textColor}99`, // 60% opacity
    '--note-text-tertiary': `${textColor}66`   // 40% opacity
  };
  
  // For dark background, use the same color for header/footer
  if (noteColor === '#333333') {
    return {
      backgroundColor: noteColor,
      color: textColor,
      headerBg: noteColor,
      footerBg: noteColor,
      cssVars
    };
  }
  
  // For white background, use a slightly darker shade for header/footer
  if (noteColor === '#ffffff') {
    return {
      backgroundColor: noteColor,
      color: textColor,
      headerBg: '#f8f8f8',
      footerBg: '#f8f8f8',
      cssVars
    };
  }
  
  // For all other colors, use the same color for header and footer
  return {
    backgroundColor: noteColor,
    color: textColor,
    headerBg: noteColor,
    footerBg: noteColor,
    cssVars
  };
}

/**
 * Get a darker shade of a color (for toolbar, etc.)
 */
export function getDarkerShade(color: string): string {
  // Simple implementation - for production, consider using a proper color library
  const colorMap: Record<string, string> = {
    '#F9FAFB': '#f3f4f6', // Light Gray -> Slightly darker gray
    '#fff9c4': '#ffe082', // Yellow -> Darker yellow
    '#ffffff': '#f5f5f5', // White -> Light gray
    '#333333': '#222222', // Black -> Darker black
    '#44475a': '#3a3d4f', // Dim Gray -> Darker dim gray
    '#2d2d2d': '#1a1a1a', // Dark Gray -> Darker gray
    '#d0f0c0': '#b8e1a3', // Pastel Green -> Darker green
    '#b5d8eb': '#9ac5de', // Pastel Blue -> Darker blue
    '#d8c2ef': '#c5a9e3', // Pastel Purple -> Darker purple
    '#f4c2c2': '#eda9a9', // Pastel Pink -> Darker pink
    '#d3d3d3': '#b8b8b8'  // Pastel Gray -> Darker gray
  };
  
  return colorMap[color] || color;
}
