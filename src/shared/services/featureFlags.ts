/**
 * Feature flags service for managing experimental features
 * Allows toggling between different implementations
 */

export interface FeatureFlags {
  useLightV2Theme: boolean;
  // Add more feature flags as needed
}

const DEFAULT_FLAGS: FeatureFlags = {
  useLightV2Theme: false, // Set to true to enable LightV2 by default
};

const STORAGE_KEY = 'scribble-feature-flags';

/**
 * Get current feature flags from localStorage
 */
export function getFeatureFlags(): FeatureFlags {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error reading feature flags:', error);
  }
  return DEFAULT_FLAGS;
}

/**
 * Save feature flags to localStorage
 */
export function saveFeatureFlags(flags: Partial<FeatureFlags>): void {
  try {
    const current = getFeatureFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // Dispatch a custom event so components can react to changes
    window.dispatchEvent(new CustomEvent('featureFlagsChanged', { 
      detail: updated 
    }));
  } catch (error) {
    console.error('Error saving feature flags:', error);
  }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] ?? false;
}

/**
 * Toggle a specific feature flag
 */
export function toggleFeature(feature: keyof FeatureFlags): void {
  const flags = getFeatureFlags();
  saveFeatureFlags({
    [feature]: !flags[feature]
  });
}

/**
 * Reset all feature flags to defaults
 */
export function resetFeatureFlags(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('featureFlagsChanged', { 
    detail: DEFAULT_FLAGS 
  }));
}

/**
 * Hook to listen for feature flag changes
 */
export function onFeatureFlagsChange(callback: (flags: FeatureFlags) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<FeatureFlags>;
    callback(customEvent.detail);
  };
  
  window.addEventListener('featureFlagsChanged', handler);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('featureFlagsChanged', handler);
  };
}
