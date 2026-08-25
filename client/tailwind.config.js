/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nocturn: тёплая почти-чёрная база с золотым акцентом
        bg: '#0A0908',
        'bg-elevated': '#0F0D0B',
        panel: '#15120F',
        'panel-2': '#1E1A15',
        card: '#131110',
        border: '#2A2419',
        'border-light': '#3B3325',
        muted: '#9A9184',
        'muted-2': '#6A6357',
        // Акцент — золото
        accent: {
          DEFAULT: '#D6B25E',
          hover: '#E7C97E',
          soft: 'rgba(214, 178, 94, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.5), 0 6px 22px rgba(0,0,0,0.4)',
        glow: '0 0 0 1px rgba(214,178,94,0.35), 0 6px 24px rgba(214,178,94,0.14)',
      },
      backgroundImage: {
        // Тёплое свечение вверху страницы, как в макете
        'nocturn-glow':
          'radial-gradient(1100px 380px at 18% -12%, rgba(214,178,94,0.16), transparent 62%)',
        'gold': 'linear-gradient(135deg, #E7C97E 0%, #C9A227 100%)',
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
