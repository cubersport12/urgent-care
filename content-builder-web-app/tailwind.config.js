/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      backgroundColor: {
        'primary': 'var(--mat-sys-primary-container) !important'
      }
    },
  },
  plugins: [],
}

