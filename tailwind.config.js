/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#14532d',
          light: '#166534',
          orange: '#f97316'
        }
      }
    }
  },
  plugins: []
}
