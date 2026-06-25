/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Тёмная «дашбордная» палитра (по референсу)
        bg: '#0E1117',
        'bg-elevated': '#10131A',
        panel: '#161A23',
        'panel-2': '#1B202B',
        card: '#171B24',
        border: '#222838',
        'border-light': '#2A3142',
        muted: '#8A93A6',
        'muted-2': '#5C6678',
        // Акцент
        accent: {
          DEFAULT: '#7C6CF6',
          hover: '#6D5DF5',
          soft: 'rgba(124, 108, 246, 0.14)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25)',
        glow: '0 0 0 1px rgba(124,108,246,0.4), 0 6px 24px rgba(124,108,246,0.18)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
