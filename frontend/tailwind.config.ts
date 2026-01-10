import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#2f4135',
          olive: '#708e53',
          beige: '#e9e2d5'
        }
      }
    }
  },
  plugins: []
}
export default config
