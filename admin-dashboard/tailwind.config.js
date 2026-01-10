/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2F4135',
        secondary: '#708E53',
        background: '#E9E2D5'
      }
    }
  },
  plugins: []
}
