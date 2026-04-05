/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'intel-blue': '#1A73E8',
        'intel-blue-dark': '#1565C0',
        'intel-blue-light': '#5B9FED',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        heading: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        portal: '12px',
      },
      boxShadow: {
        panel: '0 10px 30px rgba(15, 23, 42, 0.25)',
      },
    },
  },
  plugins: [],
}

