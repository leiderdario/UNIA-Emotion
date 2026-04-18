/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        emotion: {
          happy: '#F5C842',
          angry: '#E24B4A',
          sad: '#378ADD',
          disgusted: '#639922',
          surprised: '#D4537E',
          fearful: '#9B59B6',
          neutral: '#888780',
        },
      },
      transitionDuration: {
        1200: '1200ms',
      },
    },
  },
  plugins: [],
};
