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
      },
    },
  },
  plugins: [],
}
