import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card:        { DEFAULT: 'hsl(var(--card))',       foreground: 'hsl(var(--card-foreground))' },
        popover:     { DEFAULT: 'hsl(var(--popover))',    foreground: 'hsl(var(--popover-foreground))' },
        primary:     { DEFAULT: 'hsl(var(--primary))',    foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))',  foreground: 'hsl(var(--secondary-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted))',      foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'hsl(var(--accent))',     foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))',foreground: 'hsl(var(--destructive-foreground))' },
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        // App palette — see the token block in app/globals.css
        // Flat keys (n0…n12) so classes read bg-n3 / text-n8; a nested object would be bg-n-3
        ...Object.fromEntries(
          Array.from({ length: 13 }, (_, i) => [`n${i}`, `rgb(var(--n${i}) / <alpha-value>)`])
        ),
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          fg:      'rgb(var(--brand-fg) / <alpha-value>)',
          soft:    'rgb(var(--brand-soft) / <alpha-value>)',
          strong:  'rgb(var(--brand-strong) / <alpha-value>)',
        },
        'on-brand': 'rgb(var(--on-brand) / <alpha-value>)',
        overlay:    'rgb(var(--overlay) / <alpha-value>)',
        danger:  { DEFAULT: 'rgb(var(--red) / <alpha-value>)',     fg: 'rgb(var(--red-fg) / <alpha-value>)' },
        success: { DEFAULT: 'rgb(var(--green) / <alpha-value>)',   fg: 'rgb(var(--green-fg) / <alpha-value>)' },
        mint:    { DEFAULT: 'rgb(var(--emerald) / <alpha-value>)', fg: 'rgb(var(--emerald-fg) / <alpha-value>)', soft: 'rgb(var(--emerald-soft) / <alpha-value>)' },
      },
      fontFamily: {
        // Newsreader (app/layout.tsx), for document titles and large headings
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
export default config
