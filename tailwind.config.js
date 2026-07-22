/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#C9A84C',
        dark: '#1A1A2E',
        cream: '#F5F0E1',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
      },
      boxShadow: {
        'glow': '0 0 30px rgba(201,168,76,0.15)',
        'glow-lg': '0 0 60px rgba(201,168,76,0.1)',
        '3d': '0 4px 20px rgba(0,0,0,0.3), 0 1px 3px rgba(255,255,255,0.05)',
      },
      dropShadow: {
        'glow': '0 0 12px rgba(201,168,76,0.45)',
        'glow-lg': '0 0 24px rgba(201,168,76,0.35)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}