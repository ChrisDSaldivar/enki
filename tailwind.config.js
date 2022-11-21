import colors from 'tailwindcss/colors';
import forms from '@tailwindcss/forms';

module.exports = {
  content: ['./src/**/*.{js,jsx,tsx}'],
  darkMode: 'media', // or 'class'
  theme: {
    extend: {
      colors: {
        sky: colors.sky,
        cyan: colors.cyan,
      },
      fontFamily: {
        'Fira Code': ['Fira Code', 'sans-serif'],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [forms],
};
