module.exports = {
  content: [
    "index.html",
    "index-style.css"
  ],
  theme: {
    extend: {},
    fontSize: {
      'sm': 0.8 * 1.25 + 'rem',
      'base': 1 * 1.25 + 'rem',
      'xl': 1.25 * 1.25 + 'rem',
      '2xl': 1.563 * 1.25 + 'rem',
      '3xl': 1.953 * 1.25 + 'rem',
      '4xl': 2.441 * 1.25 + 'rem',
      '5xl': 3.052 * 1.25 + 'rem',
    },
    fontFamily: {
      'sans': "sans-serif",
      'mono': "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      'serif': "'Source Serif Pro', serif"
    }
  },
  plugins: [],
}
