import { useState, useEffect } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { Theme, ThemeName, themes } from '../../shared/styles/theme';
import { useTheme } from '../../shared/providers/ThemeProvider';



interface ThemesSectionProps {
  currentTheme: ThemeName;
  onChange: (theme: ThemeName) => void;
}

export function ThemesSection({ currentTheme, onChange }: ThemesSectionProps) {
  // Theme options
  const themeOptions = Object.values(themes);
  // Get the theme context
  const { setTheme } = useTheme();
  // State to force a refresh
  const [refreshKey, setRefreshKey] = useState(0);
  // State to track if we're refreshing
  const [isRefreshing, setIsRefreshing] = useState(false);
  // State to track the current theme display
  const [displayTheme, setDisplayTheme] = useState(currentTheme);

  // Inject CSS styles for theme cards
  useEffect(() => {
    const styleId = 'theme-card-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      .theme-card-dark .theme-card-title,
      .theme-card-dim .theme-card-title {
        color: #ffffff !important;
      }
      
      .theme-card-dark .theme-card-description,
      .theme-card-dim .theme-card-description {
        color: rgba(255, 255, 255, 0.7) !important;
      }
      
      .theme-card-light .theme-card-title {
        color: #333333 !important;
      }
      
      .theme-card-light .theme-card-description {
        color: rgba(51, 51, 51, 0.7) !important;
      }
    `;
    
    return () => {
      // Clean up on unmount
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, []);

  // Handle theme selection
  const handleThemeSelect = (theme: ThemeName) => {
    console.log('Theme selected:', theme);
    // Update the form value
    onChange(theme);
    // Update the display theme
    setDisplayTheme(theme);
    // Apply the theme immediately
    setTheme(theme);
    // Force a refresh after a short delay
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
    }, 100);
  };

  // Force refresh function
  const forceRefresh = () => {
    console.log('Forcing theme refresh');
    setIsRefreshing(true);

    // Re-apply the current theme
    setTheme(currentTheme);

    // Force a refresh of the component
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      setIsRefreshing(false);
    }, 300);
  };

  // Apply theme classes to body
  useEffect(() => {
    // Remove all theme classes from body
    document.body.classList.remove('dim', 'dark', 'light', 'theme-dim', 'theme-dark', 'theme-light');
    // Add the current theme classes to body
    document.body.classList.add(currentTheme, `theme-${currentTheme}`);
    // Also set data attribute
    document.body.setAttribute('data-theme', currentTheme);

    console.log('Theme applied to body:', currentTheme);
  }, [currentTheme, refreshKey]);

  // Listen for theme change events
  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: ThemeName }>;
      console.log('Theme change event received:', customEvent.detail.theme);
      setDisplayTheme(customEvent.detail.theme);
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('themechange', handleThemeChange);

    return () => {
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-foreground border-b border-border pb-4">Themes</h3>
        <button
          onClick={forceRefresh}
          className="flex items-center gap-1 px-3 py-1 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {themeOptions.map((theme) => (
          <ThemeCard
            key={`${theme.name}-${refreshKey}-${currentTheme}`}
            theme={theme}
            isSelected={displayTheme === theme.name}
            onSelect={() => handleThemeSelect(theme.name)}
            currentAppTheme={currentTheme}
          />
        ))}
      </div>
    </div>
  );
}

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  onSelect: () => void;
  currentAppTheme: ThemeName;
}

function ThemeCard({ theme, isSelected, onSelect, currentAppTheme }: ThemeCardProps) {
  // Get border color based on selection state
  const getBorderColor = () => {
    if (isSelected) {
      return theme.preview.primary;
    }
    return 'rgba(31, 31, 31, 0.3)';
  };

  // Get box shadow based on selection state
  const getBoxShadow = () => {
    if (isSelected) {
      return `0 4px 12px ${theme.preview.primary}40`;
    }
    return 'none';
  };

  // Get text color for theme info - ensure dark/dim themes always show light text
  const getInfoTextColor = () => {
    // Force white text for dark/dim themes - using RGB for better compatibility
    if (theme.name === 'dark' || theme.name === 'dim') {
      console.log(`FORCING WHITE TEXT for theme ${theme.name}`);
      return 'rgb(255, 255, 255)';
    }
    const color = theme.preview.foreground;
    console.log(`Theme ${theme.name} (app theme: ${currentAppTheme}) - Info text color:`, color);
    return color;
  };

  // Get description text color - ensure dark/dim themes always show muted light text
  const getDescriptionTextColor = () => {
    // Force muted white text for dark/dim themes - using RGBA for better compatibility
    if (theme.name === 'dark' || theme.name === 'dim') {
      console.log(`FORCING MUTED WHITE TEXT for theme ${theme.name}`);
      return 'rgba(255, 255, 255, 0.7)';
    }
    const color = `color-mix(in srgb, ${theme.preview.foreground} 70%, transparent)`;
    console.log(`Theme ${theme.name} (app theme: ${currentAppTheme}) - Description text color:`, color);
    return color;
  };

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: `1px solid ${getBorderColor()}`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        boxShadow: getBoxShadow(),
      }}
      onClick={onSelect}
    >
      {/* Theme preview */}
      <div style={{ height: '8rem', width: '100%', backgroundColor: theme.preview.background }}>
        {/* Header bar */}
        <div
          style={{
            height: '1.5rem',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '0.5rem',
            paddingRight: '0.5rem',
            backgroundColor: `color-mix(in srgb, ${theme.preview.background} 80%, black)`
          }}
        >
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '9999px', backgroundColor: 'rgba(239, 68, 68, 0.8)' }}></div>
            <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '9999px', backgroundColor: 'rgba(234, 179, 8, 0.8)' }}></div>
            <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '9999px', backgroundColor: 'rgba(34, 197, 94, 0.8)' }}></div>
          </div>
        </div>

        {/* Content preview */}
        <div style={{ padding: '0.75rem' }}>
          {/* Note card preview */}
          <div
            style={{
              height: '4rem',
              width: '100%',
              borderRadius: '0.375rem',
              padding: '0.5rem',
              backgroundColor: theme.preview.card,
              color: theme.preview.foreground
            }}
          >
            <div
              style={{
                width: '50%',
                height: '0.75rem',
                marginBottom: '0.5rem',
                borderRadius: '0.125rem',
                backgroundColor: `color-mix(in srgb, ${theme.preview.foreground} 15%, transparent)`
              }}
            ></div>
            <div
              style={{
                width: '100%',
                height: '0.5rem',
                marginBottom: '0.375rem',
                borderRadius: '0.125rem',
                backgroundColor: `color-mix(in srgb, ${theme.preview.foreground} 10%, transparent)`
              }}
            ></div>
            <div
              style={{
                width: '75%',
                height: '0.5rem',
                borderRadius: '0.125rem',
                backgroundColor: `color-mix(in srgb, ${theme.preview.foreground} 10%, transparent)`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Theme info */}
      <div 
        className={`theme-card-info theme-card-${theme.name}`}
        style={{
          padding: '1rem',
          backgroundColor: theme.preview.card,
          color: getInfoTextColor(),
          // Additional properties to force color inheritance
          WebkitTextFillColor: getInfoTextColor(),
          textShadow: 'none',
          // Ensure no color inheritance from parent
          colorScheme: 'normal'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 
              className={`theme-card-title theme-card-title-${theme.name}`}
              data-theme={theme.name}
              data-forced-color={theme.name === 'dark' || theme.name === 'dim' ? 'white' : 'original'}
              style={{
                fontWeight: '500',
                color: getInfoTextColor(),
                margin: 0,
                // Force the color with additional CSS properties
                WebkitTextFillColor: getInfoTextColor(),
                textShadow: 'none',
                // Additional properties to ensure color is applied
                colorScheme: 'normal',
                opacity: 1
              }}
            >{theme.label}</h4>
            <p 
              className={`theme-card-description theme-card-description-${theme.name}`}
              data-theme={theme.name}
              data-forced-color={theme.name === 'dark' || theme.name === 'dim' ? 'white' : 'original'}
              style={{
                fontSize: '0.875rem',
                color: getDescriptionTextColor(),
                margin: '0.25rem 0 0 0',
                // Force the color with additional CSS properties
                WebkitTextFillColor: getDescriptionTextColor(),
                textShadow: 'none',
                // Additional properties to ensure color is applied
                colorScheme: 'normal',
                opacity: 1
              }}
            >{theme.description}</p>
          </div>

          {isSelected && (
            <div style={{
              width: '1.25rem',
              height: '1.25rem',
              borderRadius: '9999px',
              backgroundColor: theme.preview.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Check style={{ width: '0.75rem', height: '0.75rem', color: '#000000' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
