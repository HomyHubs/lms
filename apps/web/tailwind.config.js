import colors from 'tailwindcss/colors'

/**
 * Design tokens live here (single source). Components use role names, never raw hues:
 * primary = actions/active nav, success, accent, warning, danger (docs/design/ui-reference.md).
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
        success: colors.emerald,
        accent: colors.violet,
        warning: colors.amber,
        danger: colors.rose,
      },
    },
  },
  plugins: [],
}
