// Theme plugin for Tailwind CSS
// This plugin adds theme variants for our custom themes

const plugin = require('tailwindcss/plugin');

// Create a multi-theme plugin
module.exports = plugin(function({ addBase, addVariant }) {
  // Add theme variants
  addVariant('dim', ['.theme-dim &', '[data-theme="dim"] &']);
  addVariant('dark', ['.theme-dark &', '[data-theme="dark"] &']);
  addVariant('light', ['.theme-light &', '[data-theme="light"] &']);

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
  };

  const lightTheme = {
    '--background': '0 0% 100% / 0',
    '--foreground': '0 0% 20%',
    '--card': '210 20% 98%',
    '--card-foreground': '0 0% 20%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '0 0% 20%',
    '--primary': '217 91% 60%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '210 40% 96.1%',
    '--secondary-foreground': '222.2 47.4% 11.2%',
    '--muted': '210 40% 96.1%',
    '--muted-foreground': '215.4 16.3% 46.9%',
    '--accent': '210 40% 96.1%',
    '--accent-foreground': '222.2 47.4% 11.2%',
    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '220 13% 91%',
    '--input': '220 13% 91%',
    '--ring': '224 71.4% 45%',
    '--background-notes': '0 0% 100% / 0',
    '--background-titlebar': '210 20% 98%',
    '--background-sidebar': '210 20% 98%',
  };

  // Add base styles for themes
  addBase({
    ':root': {
      '--radius': '0.5rem',
    },
    '.theme-dim': dimTheme,
    '.theme-dark': darkTheme,
    '.theme-light': lightTheme,
    // For backward compatibility
    ':root.dim, [data-theme="dim"]': dimTheme,
    ':root.dark, [data-theme="dark"]': darkTheme,
    ':root.light, [data-theme="light"]': lightTheme,
  });
});
