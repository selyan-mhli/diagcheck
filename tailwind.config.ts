import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        verdict: {
          vert: {
            DEFAULT: 'hsl(var(--verdict-vert))',
            bg: 'hsl(var(--verdict-vert-bg))',
            border: 'hsl(var(--verdict-vert-border))',
          },
          orange: {
            DEFAULT: 'hsl(var(--verdict-orange))',
            bg: 'hsl(var(--verdict-orange-bg))',
            border: 'hsl(var(--verdict-orange-border))',
          },
          rouge: {
            DEFAULT: 'hsl(var(--verdict-rouge))',
            bg: 'hsl(var(--verdict-rouge-bg))',
            border: 'hsl(var(--verdict-rouge-border))',
          },
          attente: {
            DEFAULT: 'hsl(var(--verdict-attente))',
            bg: 'hsl(var(--verdict-attente-bg))',
            border: 'hsl(var(--verdict-attente-border))',
          },
        },
        status: {
          valid: 'hsl(var(--verdict-vert))',
          uncertain: 'hsl(var(--verdict-orange))',
          refused: 'hsl(var(--verdict-rouge))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
