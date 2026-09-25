/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050a14',
        panel: '#0b1120',
        frost: '#f1f5f9',
        steel: '#94a3b8',
        brand: '#38bdf8',
        violet: '#818cf8',
        ember: '#f97316',
      },
      fontFamily: {
        display: ['"Russo One"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
