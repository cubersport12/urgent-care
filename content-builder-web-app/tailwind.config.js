/** @type {import('tailwindcss').Config} */
module.exports = {
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

