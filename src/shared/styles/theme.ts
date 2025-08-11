import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Define the available theme names
export type ThemeName = 'dim' | 'dark' | 'light' | 'lightv2';

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
  // LightV2: Structural clone of Dim with light color values
  lightv2: {
    name: 'lightv2',
    label: 'Light (New)',
    description: 'A clean light theme with solid surfaces and clear contrast',
    // Same preview structure as Dim, but with light colors
    preview: {
      background: '#ffffff',      // Solid white instead of Dim's #282a36
      foreground: '#1f2937',      // Dark gray-800 instead of Dim's #f8f8f2
      primary: '#3b82f6',         // Blue-500 instead of Dim's amber #f59e0b
      card: '#f9fafb',            // Gray-50 instead of Dim's #21222c
    },
    // Same transparency structure as Dim, but with light-appropriate values
    transparency: {
      vibrancyMaterial: 'light',                    // Light material instead of 'dark'
      backdropBlur: 'blur(20px)',                   // Same blur as Dim
      overlayColor: 'rgba(255, 255, 255, 0.15)',    // White overlay instead of dark
      overlayOpacity: 0.15,                         // Same opacity as Dim
    },
  },
};

// Utility function to combine class names with Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
