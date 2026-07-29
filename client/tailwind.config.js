/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0eeff',
          100: '#e4e0ff',
          200: '#ccc5ff',
          300: '#aa9bff',
          400: '#8b6fff',
          500: '#6c63ff',
          600: '#5a4de6',
          700: '#4a3dc0',
          800: '#3d339b',
          900: '#342c80',
        },
        accent: {
          cyan: '#00d4ff',
          green: '#00e676',
          amber: '#ffb74d',
          red: '#ff5252',
        },
        dark: {
          900: '#0f0f1a',
          800: '#1a1a2e',
          700: '#16213e',
          600: '#1e2845',
          500: '#252d4a',
          400: '#2d3561',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6c63ff 0%, #00d4ff 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(108,99,255,0.1) 0%, rgba(0,212,255,0.1) 100%)',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(108, 99, 255, 0.3)',
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-green': '0 0 20px rgba(0, 230, 118, 0.3)',
        card: '0 4px 24px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(108,99,255,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        bounceGentle: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
    },
  },
  plugins: [],
};
