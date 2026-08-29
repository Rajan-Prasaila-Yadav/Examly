import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F7FF',
          100: '#E0EFFF',
          200: '#BAE0FF',
          300: '#7CC4FA',
          400: '#38A4F4',
          500: '#0079D8', // Brand Action Blue from APK
          600: '#025FA8',
          700: '#024D85',
          800: '#023C69', // Dark Header Blue from APK
          900: '#012847',
        },
        accent: {
          purple: '#9333EA',
          indigo: '#6366F1',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
        },
        exam: {
          answered: '#16A34A',
          review: '#9333EA',
          unanswered: '#DC2626',
          unvisited: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
