const scalingfactor = 1.2;
module.exports = {
  content: [
    "index.html",
    "index-style.css"
  ],
  theme: {
    extend: {},
    fontSize: {
      'sm': 0.8 * scalingfactor + 'rem',
      'base': 1 * scalingfactor + 'rem',
      'xl': 1.25 * scalingfactor + 'rem',
      '2xl': 1.563 * scalingfactor + 'rem',
      '3xl': 1.953 * scalingfactor + 'rem',
      '4xl': 2.441 * scalingfactor + 'rem',
      '5xl': 3.052 * scalingfactor + 'rem',
    },
    fontFamily: {
      'sans': "sans-serif",
      'mono': "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      'serif': "'Source Serif Pro', serif"
    }
  },
  plugins: [],
}
