import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        substrate: '#0A0A0A',
        surface: '#121212',
        phosphor: '#EAEAEA',
        accent: '#E61919',
        'terminal-green': '#4AF626',
        border: '#2A2A2A',
        muted: '#8A8A8A',
      },
      letterSpacing: {
        'display-tight': '-0.06em',
        'display': '-0.03em',
        'telemetry': '0.08em',
      },
    },
  },
  plugins: [],
}

export default config
