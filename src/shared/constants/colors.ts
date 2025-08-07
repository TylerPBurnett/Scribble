/**
 * Shared color constants for note backgrounds
 */

export interface NoteColorOption {
  name: string;
  value: string;
  textColor?: string; // Optional text color for better contrast
}

export const NOTE_COLOR_OPTIONS: NoteColorOption[] = [
  { name: 'Yellow', value: '#fff9c4', textColor: '#333333' }, // Default sticky note color
  { name: 'White', value: '#ffffff', textColor: '#333333' },
  { name: 'Black', value: '#333333', textColor: '#ffffff' },
  { name: 'Pastel Green', value: '#d0f0c0', textColor: '#333333' },
  { name: 'Pastel Blue', value: '#b5d8eb', textColor: '#333333' },
  { name: 'Pastel Purple', value: '#d8c2ef', textColor: '#333333' },
  { name: 'Pastel Pink', value: '#f4c2c2', textColor: '#333333' },
  { name: 'Pastel Gray', value: '#d3d3d3', textColor: '#333333' }
];

/**
 * Get the appropriate text color for a given background color
 */
export function getTextColorForBackground(backgroundColor: string): string {
  const colorOption = NOTE_COLOR_OPTIONS.find(option => option.value === backgroundColor);
  return colorOption?.textColor || '#333333';
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
      footerBg: ''
    };
  }

  const textColor = getTextColorForBackground(noteColor);
  
  // For dark background, use the same color for header/footer
  if (noteColor === '#333333') {
    return {
      backgroundColor: noteColor,
      color: textColor,
      headerBg: noteColor,
      footerBg: noteColor
    };
  }
  
  // For white background, use a slightly darker shade for header/footer
  if (noteColor === '#ffffff') {
    return {
      backgroundColor: noteColor,
      color: textColor,
      headerBg: '#f8f8f8',
      footerBg: '#f8f8f8'
    };
  }
  
  // For all other colors, use the same color for header and footer
  return {
    backgroundColor: noteColor,
    color: textColor,
    headerBg: noteColor,
    footerBg: noteColor
  };
}

/**
 * Get a darker shade of a color (for toolbar, etc.)
 */
export function getDarkerShade(color: string): string {
  // Simple implementation - for production, consider using a proper color library
  const colorMap: Record<string, string> = {
    '#fff9c4': '#ffe082', // Yellow -> Darker yellow
    '#ffffff': '#f5f5f5', // White -> Light gray
    '#333333': '#222222', // Black -> Darker black
    '#d0f0c0': '#b8e1a3', // Pastel Green -> Darker green
    '#b5d8eb': '#9ac5de', // Pastel Blue -> Darker blue
    '#d8c2ef': '#c5a9e3', // Pastel Purple -> Darker purple
    '#f4c2c2': '#eda9a9', // Pastel Pink -> Darker pink
    '#d3d3d3': '#b8b8b8'  // Pastel Gray -> Darker gray
  };
  
  return colorMap[color] || color;
}
