import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Define the available theme names
export type ThemeName = 'dim' | 'dark' | 'light';

// Transparency configuration interface
export interface ThemeTransparency {
  vibrancyMaterial: string;
  backdropBlur: string;
  overlayColor: string;
  overlayOpacity: number;
}

// Theme interface
export interface Theme {
  name: ThemeName;
  label: string;
  description: string;
  // Preview colors for the theme selector
  preview: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
  };
  // Transparency properties for native effects
  transparency: ThemeTransparency;
}

// Define the themes
export const themes: Record<ThemeName, Theme> = {
  dim: {
    name: 'dim',
    label: 'Dim',
    description: 'The original Scribble theme with muted colors',
    preview: {
      background: '#282a36',
      foreground: '#f8f8f2',
      primary: '#f59e0b',
      card: '#21222c',
    },
    transparency: {
      vibrancyMaterial: 'dark',
      backdropBlur: 'blur(20px)',
      overlayColor: 'rgba(40, 42, 54, 0.15)',
      overlayOpacity: 0.15,
    },
  },
  dark: {
    name: 'dark',
    label: 'Dark',
    description: 'A true dark theme with deeper blacks and higher contrast',
    preview: {
      background: '#121212',
      foreground: '#ffffff',
      primary: '#f59e0b',
      card: '#1a1a1a',
    },
    transparency: {
      vibrancyMaterial: 'ultra-dark',
      backdropBlur: 'blur(20px)',
      overlayColor: 'rgba(18, 18, 18, 0.2)',
      overlayOpacity: 0.2,
    },
  },
  light: {
    name: 'light',
    label: 'Light',
    description: 'A light theme with white background and dark text',
    preview: {
      background: '#ffffff',
      foreground: '#333333',
      primary: '#3b82f6',
      card: '#f9fafb',
    },
    transparency: {
      vibrancyMaterial: 'light',
      backdropBlur: 'blur(20px)',
      overlayColor: 'rgba(255, 255, 255, 0.1)',
      overlayOpacity: 0.1,
    },
  },
};

// Utility function to combine class names with Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
