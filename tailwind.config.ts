import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0C0A09',
        surface: '#1C1917',
        border: '#292524',
        primary: '#6366F1',
        'primary-hover': '#818CF8',
        'text-primary': '#FAFAF9',
        'text-secondary': '#A8A29E',
        'text-muted': '#57534E',
        'text-mono': '#E7E5E4',
        success: '#22C55E',
        warning: '#EAB308',
        error: '#EF4444',
      },
      fontFamily: {
        headline: ['Syne', 'sans-serif'],
        body: ['Geist', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
    },
  },
  plugins: [],
};

export default config;
