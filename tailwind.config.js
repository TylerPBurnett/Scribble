/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from "tailwindcss-animate";
import themePlugin from "./src/shared/styles/theme-plugin.js";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue}",
    "./note.html",
    "./settings.html"
  ],
  theme: {
    screens: {
      'xs': '450px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        'primary-dark': '#e69009',
        background: 'hsl(var(--background))',
        'background-notes': 'hsl(var(--background-notes))',
        'background-titlebar': 'hsl(var(--background-titlebar))',
        'background-sidebar': 'hsl(var(--background-sidebar))',
        'background-search': 'hsl(var(--background-search))',
        'search-hover-outline': 'hsl(var(--search-hover-outline))',
        border: 'hsl(var(--border))',
        text: {
          DEFAULT: 'hsl(var(--foreground))',
          secondary: 'hsl(var(--muted-foreground))',
          tertiary: 'hsl(var(--muted-foreground) / 0.8)'
        },
        note: {
          slate: '#64748b',
          sky: '#0ea5e9',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          violet: '#8b5cf6'
        },
        danger: '#f43f5e',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      },
      backgroundColor: {
        'white-5': 'rgba(255, 255, 255, 0.05)',
        'black-10': 'rgba(0, 0, 0, 0.1)',
        'primary-10': 'rgba(245, 158, 11, 0.1)'
      },
      gridTemplateColumns: {
        'auto-fill-250': 'repeat(auto-fill, minmax(250px, 1fr))',
        'auto-fill-200': 'repeat(auto-fill, minmax(200px, 1fr))',
        'auto-fill-180': 'repeat(auto-fill, minmax(180px, 1fr))',
        '1-col': 'repeat(1, 1fr)',
        '2-col': 'repeat(2, 1fr)',
        '3-col': 'repeat(3, 1fr)'
      },
      height: {
        'note-card': '200px',
        'note-card-compact': '170px'
      },
      width: {
        sidebar: '240px',
        'sidebar-compact': '56px'
      },
      translate: {
        sidebar: '240px',
        'sidebar-compact': '56px'
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        selected: '0 0 0 2px #f59e0b'
      },
      borderWidth: {
        '3': '3px'
      },
      fontFamily: {
        sans: [
          'Chirp',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        twitter: [
          'Chirp',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ]
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem'
      },
      letterSpacing: {
        wider: '0.05em'
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        full: '9999px',
        sm: 'calc(var(--radius) - 4px)'
      },
      transitionProperty: {
        colors: 'color, background-color, border-color',
        transform: 'transform',
        all: 'all'
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms'
      }
    }
  },
  plugins: [tailwindcssAnimate, themePlugin],
}
