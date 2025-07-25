# Design Document

## Overview

This design implements a native Apple transparency effect for the notes list background in the main window. The solution uses a multi-layered approach combining Electron's native vibrancy capabilities on macOS, Windows acrylic effects where supported, and CSS-based fallbacks for other platforms. The transparency effect will be applied specifically to the notes list container while preserving the existing theme system (light, dark, dim) and maintaining optimal performance.

## Architecture

### Platform-Specific Implementation Strategy

**macOS (Primary Target):**
- Use Electron's `vibrancy` option in BrowserWindow configuration
- Apply `NSVisualEffectView` with appropriate material types for each theme
- Leverage native backdrop blur and color blending

**Windows (Secondary Support):**
- Use Electron's experimental acrylic effects where available
- Implement CSS backdrop-filter as fallback
- Apply theme-appropriate transparency values

**Cross-Platform Fallback:**
- CSS-based backdrop-filter with blur effects
- Semi-transparent overlays with theme-specific colors
- Graceful degradation for unsupported browsers

### Integration Points

1. **Electron Main Process** (`electron/main.ts`)
   - Configure BrowserWindow with vibrancy settings
   - Platform detection and appropriate transparency setup
   - Window configuration updates for main window only

2. **Theme System Integration** (`src/shared/styles/theme.ts`)
   - Extend theme definitions with transparency-specific properties
   - Add vibrancy material mappings for each theme
   - Maintain backward compatibility

3. **Component Layer** (`src/main-window/components/NoteList.tsx`)
   - Apply transparency classes to notes container
   - Ensure proper layering and z-index management
   - Maintain existing functionality and styling

## Components and Interfaces

### 1. Electron Configuration Enhancement

```typescript
interface VibrancyConfig {
  material: 'light' | 'dark' | 'titlebar' | 'selection' | 'menu' | 'popover' | 'sidebar' | 'medium-light' | 'ultra-dark';
  theme: ThemeName;
}

interface TransparencySettings {
  enabled: boolean;
  platform: 'darwin' | 'win32' | 'linux';
  vibrancy?: VibrancyConfig;
  acrylic?: boolean;
  fallback: boolean;
}
```

### 2. Theme System Extensions

```typescript
interface ThemeTransparency {
  vibrancyMaterial: string;
  backdropBlur: string;
  overlayColor: string;
  overlayOpacity: number;
}

interface ExtendedTheme extends Theme {
  transparency: ThemeTransparency;
}
```

### 3. CSS Classes and Styling

```css
.notes-container-transparent {
  /* Base transparency setup */
  position: relative;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.notes-container-transparent::before {
  /* Overlay for color tinting */
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--transparency-overlay);
  opacity: var(--transparency-opacity);
  pointer-events: none;
  z-index: -1;
}
```

## Data Models

### Theme Configuration Updates

```typescript
const transparencyThemes: Record<ThemeName, ThemeTransparency> = {
  light: {
    vibrancyMaterial: 'light',
    backdropBlur: 'blur(20px)',
    overlayColor: 'rgba(255, 255, 255, 0.7)',
    overlayOpacity: 0.8
  },
  dark: {
    vibrancyMaterial: 'ultra-dark',
    backdropBlur: 'blur(20px)',
    overlayColor: 'rgba(18, 18, 18, 0.7)',
    overlayOpacity: 0.8
  },
  dim: {
    vibrancyMaterial: 'dark',
    backdropBlur: 'blur(20px)',
    overlayColor: 'rgba(40, 42, 54, 0.7)',
    overlayOpacity: 0.8
  }
};
```

### Electron Window Configuration

```typescript
const createMainWindowWithTransparency = () => {
  const transparencyConfig: TransparencySettings = {
    enabled: true,
    platform: process.platform as 'darwin' | 'win32' | 'linux',
    vibrancy: process.platform === 'darwin' ? {
      material: 'light', // Will be updated based on theme
      theme: 'dim' // Default theme
    } : undefined,
    acrylic: process.platform === 'win32',
    fallback: true
  };

  const windowOptions: BrowserWindowConstructorOptions = {
    // ... existing options
    vibrancy: transparencyConfig.vibrancy?.material,
    transparent: transparencyConfig.platform !== 'win32',
    backgroundMaterial: transparencyConfig.platform === 'win32' ? 'acrylic' : undefined
  };
};
```

## Error Handling

### Platform Compatibility Checks

1. **Feature Detection**
   - Check for native vibrancy support on macOS
   - Verify acrylic availability on Windows
   - Test CSS backdrop-filter support

2. **Graceful Degradation**
   - Fallback to CSS-only transparency if native features fail
   - Maintain original styling if transparency is unsupported
   - Log warnings for debugging without breaking functionality

3. **Performance Monitoring**
   - Monitor rendering performance with transparency enabled
   - Provide option to disable transparency if performance issues occur
   - Implement lazy loading for transparency effects

### Error Recovery Strategies

```typescript
const applyTransparencyWithFallback = (theme: ThemeName) => {
  try {
    // Attempt native transparency
    if (process.platform === 'darwin') {
      return applyMacOSVibrancy(theme);
    } else if (process.platform === 'win32') {
      return applyWindowsAcrylic(theme);
    }
  } catch (error) {
    console.warn('Native transparency failed, using CSS fallback:', error);
    return applyCSSTransparency(theme);
  }
};
```

## Testing Strategy

### Unit Tests

1. **Theme Integration Tests**
   - Verify transparency properties are correctly applied for each theme
   - Test theme switching with transparency enabled
   - Validate CSS class generation and application

2. **Platform Detection Tests**
   - Mock different platforms and verify appropriate transparency methods
   - Test fallback behavior when native features are unavailable
   - Validate configuration object generation

### Integration Tests

1. **Electron Window Tests**
   - Test main window creation with transparency enabled
   - Verify vibrancy settings are applied correctly
   - Test window behavior with transparency across different themes

2. **Component Rendering Tests**
   - Test NoteList component with transparency classes
   - Verify proper layering and z-index behavior
   - Test interaction with existing styling and animations

### Manual Testing Scenarios

1. **Cross-Platform Testing**
   - Test on macOS with different system themes
   - Test on Windows with acrylic support
   - Test fallback behavior on Linux

2. **Theme Switching Tests**
   - Switch between light, dark, and dim themes with transparency
   - Verify smooth transitions and proper color adaptation
   - Test edge cases like rapid theme switching

3. **Performance Testing**
   - Monitor CPU and GPU usage with transparency enabled
   - Test with large numbers of notes
   - Verify smooth scrolling and animations

### Accessibility Considerations

1. **Contrast Validation**
   - Ensure sufficient contrast ratios with transparency overlay
   - Test readability across all themes
   - Verify compliance with WCAG guidelines

2. **Reduced Motion Support**
   - Respect system preferences for reduced motion
   - Provide option to disable transparency effects
   - Maintain functionality without visual effects

## Implementation Phases

### Phase 1: Electron Configuration
- Update main process to support vibrancy configuration
- Implement platform detection and appropriate window settings
- Add theme-based vibrancy material selection

### Phase 2: Theme System Integration
- Extend theme definitions with transparency properties
- Update theme provider to handle transparency settings
- Implement CSS custom properties for transparency values

### Phase 3: Component Implementation
- Apply transparency classes to NoteList container
- Implement proper layering and styling
- Ensure compatibility with existing animations and interactions

### Phase 4: Cross-Platform Support
- Implement Windows acrylic support
- Add CSS fallback for unsupported platforms
- Test and refine across different operating systems

### Phase 5: Testing and Optimization
- Comprehensive testing across platforms and themes
- Performance optimization and monitoring
- Documentation and user feedback integration