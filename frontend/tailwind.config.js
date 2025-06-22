/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        dark: {
          primary: '#121212',
          secondary: '#1E1E1E',
          accent: '#00F5A0',
          text: {
            primary: '#EAEAEA',
            secondary: '#A0A0A0',
          },
          border: '#333333',
        },
        light: {
          primary: '#F7F7F7',
          secondary: '#FFFFFF',
          accent: '#00C884',
          text: {
            primary: '#1F2937',
            secondary: '#6B7280',
          },
          border: '#E5E7EB',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        '8xl': '1280px',
      },
    },
  },
  plugins: [],
};