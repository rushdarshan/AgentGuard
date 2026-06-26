import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        accent: '#111111',
        background: '#FBFBFA',
        foreground: '#111111',
        card: '#FFFFFF',
        border: '#EAEAEA',
        muted: {
          foreground: '#787774',
        },
        pastel: {
          red: { bg: '#FDEBEC', text: '#9F2F2D' },
          blue: { bg: '#E1F3FE', text: '#1F6C9F' },
          green: { bg: '#EDF3EC', text: '#346538' },
          yellow: { bg: '#FBF3DB', text: '#956400' },
        },
      },
      boxShadow: {
        subtle: '0 2px 8px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}

export default config
