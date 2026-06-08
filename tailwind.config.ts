import type { Config } from 'tailwindcss'
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'best-blue': '#1e40af',
        'best-green': '#16a34a',
        'best-yellow': '#ca8a04',
        'best-red': '#dc2626',
        'best-purple': '#7c3aed',
      },
    },
  },
  plugins: [],
}
export default config