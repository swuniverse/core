/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'empire': {
          DEFAULT: '#1a1a1a',
          light: '#2a2a2a',
        },
        'rebel': {
          DEFAULT: '#c41e3a',
          light: '#e74c3c',
        },
        'space': {
          DEFAULT: '#0a0e27',
          light: '#1a1f3a',
        },
        'holo': {
          DEFAULT: '#00ffff',
          dark: '#00cccc',
          light: '#00ffff',
          accent: '#ff00ff',
          bg: '#001a1a',
          card: '#001a2e',
        },
      },
      boxShadow: {
        'holo': '0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 20px rgba(0, 255, 255, 0.1)',
        'holo-lg': '0 0 40px rgba(0, 255, 255, 0.8), inset 0 0 40px rgba(0, 255, 255, 0.2)',
        'holo-accent': '0 0 30px rgba(255, 0, 255, 0.6)',
      },
      keyframes: {
        flicker: {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.8' },
        },
        glow: {
          '0%, 100%': { textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' },
          '50%': { textShadow: '0 0 20px rgba(0, 255, 255, 1)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        flicker: 'flicker 3s infinite',
        glow: 'glow 2s ease-in-out infinite',
        scan: 'scan 8s linear infinite',
      },
    },
  },
  plugins: [],
}
