/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Propex: глубокий фиолетово-баклажановый фон, пурпурный акцент,
        // бирюза для положительной динамики.
        bg: '#0B0713',
        'bg-elevated': '#120C1F',
        panel: '#181129',
        'panel-2': '#221838',
        card: '#151024',
        border: '#2C2142',
        'border-light': '#3D2E5A',
        muted: '#9A8FB5',
        'muted-2': '#6B6188',
        // Акцент — пурпур с уходом в фуксию
        accent: {
          DEFAULT: '#A855F7',
          hover: '#B96BFF',
          soft: 'rgba(168, 85, 247, 0.14)',
        },
        // Вторичный акцент — бирюза (рост, положительная динамика)
        mint: {
          DEFAULT: '#2DD4BF',
          soft: 'rgba(45, 212, 191, 0.14)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.45), 0 8px 26px rgba(0,0,0,0.38)',
        glow: '0 0 0 1px rgba(168,85,247,0.35), 0 8px 28px rgba(168,85,247,0.22)',
      },
      backgroundImage: {
        // Тёплое свечение вверху страницы, как в макете
        // Подсветка сцены: пурпур сверху-слева, малиновый справа
        'nocturn-glow':
          'radial-gradient(900px 420px at 12% -10%, rgba(168,85,247,0.20), transparent 60%), radial-gradient(720px 360px at 88% 4%, rgba(236,72,153,0.14), transparent 62%)',
        // Градиент кнопок и активного пункта меню
        'gold': 'linear-gradient(135deg, #C061F5 0%, #EC4899 100%)',
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
