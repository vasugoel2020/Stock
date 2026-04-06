/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          bg: '#0a0e1a',
          surface: '#151b2e',
          card: '#1a2234',
          border: '#2d3548',
        },
        success: {
          bg: '#dcfce7',
          text: '#166534',
          border: '#86efac',
        },
        warning: {
          bg: '#fef3c7',
          text: '#92400e',
          border: '#fcd34d',
        },
        danger: {
          bg: '#fee2e2',
          text: '#991b1b',
          border: '#fca5a5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(14, 165, 233, 0.15)',
        'glow-md': '0 0 25px rgba(14, 165, 233, 0.2)',
        'glow-lg': '0 0 35px rgba(14, 165, 233, 0.25)',
      },
    },
  },
  plugins: [],
}
