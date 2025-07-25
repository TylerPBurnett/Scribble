import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, getSettings, saveSettings } from '../services/settingsService';
import { ThemeName, themes } from '../styles/theme';

// Theme context interface
interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: typeof themes;
}

// Create the theme context
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dim',
  setTheme: () => {},
  themes,
});

// Theme provider props
interface ThemeProviderProps {
  children: React.ReactNode;
  initialSettings?: AppSettings;
}

/**
 * Theme provider component
 * Manages the application theme and provides theme context to child components
 */
export const ThemeProvider = ({
  children,
  initialSettings
}: ThemeProviderProps) => {
  // Get the initial theme from settings or use 'dim' as default
  const [theme, setThemeState] = useState<ThemeName>(
    (initialSettings?.theme as ThemeName) || 'dim'
  );

  // Apply the theme to the document
  useEffect(() => {
    console.log('Applying theme:', theme);
    
    // Apply theme class to document element
    document.documentElement.classList.remove('dim', 'dark', 'light');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Apply theme-specific class
    document.documentElement.classList.remove('theme-dim', 'theme-dark', 'theme-light');
    document.documentElement.classList.add(`theme-${theme}`);
    
    // Apply transparency CSS variables
    const currentTheme = themes[theme];
    if (currentTheme?.transparency) {
      const { transparency } = currentTheme;
      const root = document.documentElement;
      
      console.log('Setting transparency variables:', transparency);
      
      // Set CSS custom properties for transparency
      root.style.setProperty('--transparency-backdrop-blur', transparency.backdropBlur);
      root.style.setProperty('--transparency-overlay-color', transparency.overlayColor);
      root.style.setProperty('--transparency-overlay-opacity', transparency.overlayOpacity.toString());
      root.style.setProperty('--transparency-vibrancy-material', transparency.vibrancyMaterial);
      
      // Add theme-specific transparency class for enhanced styling
      root.classList.remove('transparency-light', 'transparency-dark', 'transparency-dim');
      root.classList.add(`transparency-${theme}`);
      
      // Add transparency class to document element
      root.classList.add('transparency-enabled');
      
      // Enable window transparency in Electron if available
      if (window.ipcRenderer) {
        try {
          window.ipcRenderer.invoke('set-window-transparency', true);
        } catch (error) {
          console.error('Error enabling window transparency:', error);
        }
      }
      
      console.log('Transparency variables set:', {
        backdropBlur: transparency.backdropBlur,
        overlayColor: transparency.overlayColor,
        overlayOpacity: transparency.overlayOpacity,
        vibrancyMaterial: transparency.vibrancyMaterial
      });
      console.log('Check CSS custom properties in dev tools.');
    }
    
    // Update settings if needed
    const currentSettings = getSettings();
    if (currentSettings.theme !== theme) {
      console.log('Saving theme to settings:', theme);
      // Save the theme to settings
      saveSettings({
        ...currentSettings,
        theme,
      });

      // If this is the settings window, notify the main window to update its theme
      if (window.settings && typeof window.ipcRenderer !== 'undefined') {
        try {
          console.log('Notifying main process of theme change:', theme);
          // Notify the main process that the theme has changed
          window.ipcRenderer.send('theme-changed', theme);
          
          // Also notify about vibrancy changes for transparency effects
          if (currentTheme?.transparency) {
            window.ipcRenderer.send('vibrancy-changed', {
              theme,
              material: currentTheme.transparency.vibrancyMaterial
            });
          }
        } catch (error) {
          console.error('Error notifying theme change:', error);
        }
      }
    }
  }, [theme]);

  // Listen for theme changes from the main process
  useEffect(() => {
    if (!window.ipcRenderer) return;
    
    const handleThemeChanged = (_event: any, newTheme: ThemeName) => {
      console.log('Theme changed from main process:', newTheme);
      setThemeState(newTheme);
    };

    const handleVibrancyChanged = (_event: any, vibrancyData: { theme: ThemeName; material: string }) => {
      console.log('Vibrancy changed from main process:', vibrancyData);
      // Update transparency settings if the theme matches
      if (vibrancyData.theme === theme) {
        const currentTheme = themes[vibrancyData.theme];
        if (currentTheme?.transparency) {
          const root = document.documentElement;
          root.style.setProperty('--transparency-vibrancy-material', vibrancyData.material);
        }
      }
    };

    // Add event listeners
    window.ipcRenderer.on('theme-changed', handleThemeChanged);
    window.ipcRenderer.on('vibrancy-changed', handleVibrancyChanged);

    // Clean up
    return () => {
      window.ipcRenderer.off('theme-changed', handleThemeChanged);
      window.ipcRenderer.off('vibrancy-changed', handleVibrancyChanged);
    };
  }, [theme]);

  // Set theme function
  const setTheme = (newTheme: ThemeName) => {
    console.log('Setting theme to:', newTheme);
    setThemeState(newTheme);
  };

  const value = {
    theme,
    setTheme,
    themes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);
