/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: [
        'Inter',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Oxygen',
        'Ubuntu',
        'Cantarell',
        'Open Sans',
        'Helvetica Neue',
        'sans-serif',
      ],
    },
    extend: {
      colors: {
        primary: {
          default: 'var(--primary-color-default)',
          light: 'var(--primary-color-light)',
          dark: 'var(--primary-color-dark)',
        },
      },
    },
  },
  plugins: [],
};
