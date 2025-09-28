import type { Config } from 'tailwindcss'

const config: Config & { daisyui?: any } = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: ['synthwave', 'nord'],
  },
}

export default config
