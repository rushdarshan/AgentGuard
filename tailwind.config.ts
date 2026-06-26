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
        sans: ['"IBM Plex Sans"', ...defaultTheme.fontFamily.sans],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        accent: '#6366F1',
        background: 'rgb(7, 11, 20)',
        foreground: 'rgb(241, 245, 249)',
        card: 'rgb(17, 24, 39)',
        border: 'rgba(255, 255, 255, 0.06)',
        muted: {
          foreground: 'rgb(100, 116, 139)',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(99, 102, 241, 0.25)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 35px rgba(99, 102, 241, 0.4)',
      },
    },
  },
  plugins: [],
}

export default config
