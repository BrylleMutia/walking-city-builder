const tokens = require('./src/theme/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: tokens.colors,
      borderRadius: {
        card: `${tokens.radius.card}px`,
        tile: `${tokens.radius.tile}px`,
        chip: `${tokens.radius.chip}px`,
      },
      // Custom fonts on React Native need one family per weight, so weights
      // are picked with these instead of `font-bold` etc.
      fontFamily: {
        body: [tokens.fonts.body],
        semi: [tokens.fonts.semi],
        strong: [tokens.fonts.strong],
        heavy: [tokens.fonts.heavy],
      },
    },
  },
  plugins: [],
};
