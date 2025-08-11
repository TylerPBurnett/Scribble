// Theme plugin for Tailwind CSS
// This plugin adds theme variants for our custom themes

const plugin = require('tailwindcss/plugin');

// Create a multi-theme plugin
module.exports = plugin(function({ addBase, addVariant }) {
  // Add theme variants
  addVariant('dim', ['.theme-dim &', '[data-theme="dim"] &']);
  addVariant('dark', ['.theme-dark &', '[data-theme="dark"] &']);
  // Legacy light theme variant now maps to lightv2
  addVariant('light', ['.theme-lightv2 &', '[data-theme="lightv2"] &']);
  addVariant('lightv2', ['.theme-lightv2 &', '[data-theme="lightv2"] &']);

  // Define the theme colors
  const dimTheme = {
    '--background': '231 15% 20%',
    '--foreground': '60 9.1% 97.8%',
    '--card': '226 11% 29%',
    '--card-foreground': '60 9.1% 97.8%',
    '--popover': '232 14% 17%',
    '--popover-foreground': '60 9.1% 97.8%',
    '--primary': '39 100% 50%',
    '--primary-foreground': '0 0% 0%',
    '--secondary': '232 14% 22%',
    '--secondary-foreground': '60 9.1% 97.8%',
    '--muted': '232 14% 22%',
    '--muted-foreground': '24 5.4% 75%',
    '--accent': '232 14% 22%',
    '--accent-foreground': '60 9.1% 97.8%',
    '--destructive': '0 62.8% 30.6%',
    '--destructive-foreground': '60 9.1% 97.8%',
    '--border': '232 14% 25%',
    '--input': '232 14% 22%',
    '--ring': '24 5.7% 82.9%',
    '--background-notes': '231 15% 18%',
    '--background-titlebar': '232 14% 15%',
    '--background-sidebar': '232 14% 15%',
    '--background-search': '231 11% 21%', // #2D2E3A
    '--search-hover-outline': '232 14% 28%', // #454652
  };

  const darkTheme = {
    '--background': '0 0% 10%',
    '--foreground': '0 0% 100%',
    '--card': '0 0% 13%',
    '--card-foreground': '0 0% 100%',
    '--popover': '0 0% 10%',
    '--popover-foreground': '0 0% 100%',
    '--primary': '39 100% 50%',
    '--primary-foreground': '0 0% 0%',
    '--secondary': '0 0% 16%',
    '--secondary-foreground': '0 0% 100%',
    '--muted': '0 0% 16%',
    '--muted-foreground': '0 0% 75%',
    '--accent': '0 0% 16%',
    '--accent-foreground': '0 0% 100%',
    '--destructive': '0 62.8% 30.6%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '0 0% 20%',
    '--input': '0 0% 16%',
    '--ring': '0 0% 80%',
    '--background-notes': '0 0% 7%',
    '--background-titlebar': '0 0% 10%',
    '--background-sidebar': '0 0% 10%',
    '--background-search': '0 0% 14%', // #242424
    '--search-hover-outline': '0 0% 23%', // #3A3A3A
  };

  // LightV2: The new light theme
  const lightV2Theme = {
    '--background': '210 20% 98%',           // Light gray #F9FAFB for consistency
    '--foreground': '217 19% 27%',         // Dark gray for text
    '--card': '210 20% 98%',               // Same as background for consistency
    '--card-foreground': '217 19% 27%',    // Dark gray for card text
    '--popover': '0 0% 100%',              // Pure white for popovers
    '--popover-foreground': '217 19% 27%', // Dark gray for popover text
    '--primary': '217 91% 60%',            // Blue for primary actions
    '--primary-foreground': '0 0% 100%',   // White on primary
    '--secondary': '210 40% 96%',          // Light gray for secondary
    '--secondary-foreground': '217 19% 27%', // Dark gray on secondary
    '--muted': '210 40% 96%',              // Light gray for muted elements
    '--muted-foreground': '215 16% 47%',   // Mid gray for muted text
    '--accent': '210 40% 96%',             // Light gray for accents
    '--accent-foreground': '217 19% 27%',  // Dark gray on accent
    '--destructive': '0 84% 60%',          // Red for destructive actions
    '--destructive-foreground': '0 0% 100%', // White on destructive
    '--border': '214 32% 91%',             // Light border
    '--input': '214 32% 91%',              // Light input border
    '--ring': '217 91% 60%',               // Blue focus ring
    '--background-notes': '210 20% 98%',   // #F9FAFB - matches note card background
    '--background-titlebar': '210 20% 98%', // Light gray titlebar
    '--background-sidebar': '210 20% 98%',  // Light gray sidebar
    '--background-search': '220 13% 96%',   // #F8F8FA for search
    '--search-hover-outline': '220 13% 91%', // Lighter outline on hover
  };

  // Add base styles for themes
  addBase({
    ':root': {
      '--radius': '0.5rem',
    },
    '.theme-dim': dimTheme,
    '.theme-dark': darkTheme,
    // Legacy light theme class now maps to lightv2
    '.theme-light': lightV2Theme,
    '.theme-lightv2': lightV2Theme,
    // For backward compatibility
    ':root.dim, [data-theme="dim"]': dimTheme,
    ':root.dark, [data-theme="dark"]': darkTheme,
    // Legacy light theme data attribute now maps to lightv2
    ':root.light, [data-theme="light"]': lightV2Theme,
    ':root.lightv2, [data-theme="lightv2"]': lightV2Theme,
  });
});
