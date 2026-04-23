import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-black': '#000000',
        'brand-teal': '#73C5CC',
        'brand-teal-deep': '#2B4E55',
        'text-primary': '#FFFFFF',
        'text-secondary': '#7D8591',
      },
      fontFamily: {
        sans: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        wider: '0.15em',
      },
    },
  },
  plugins: [],
} satisfies Config
