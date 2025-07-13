/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'vscode-dark': '#1e1e1e',
        'vscode-light': '#cccccc',
        'vscode-tab-active': '#2d2d2d',
        'vscode-tab-inactive': '#252526',
        'vscode-border': '#464647',
        'vscode-text': '#cccccc',
        'vscode-text-inactive': '#969696'
      },
      fontSize: {
        'tab': '13px'
      },
      height: {
        'tab-bar': '35px'
      }
    }
  },
  plugins: []
}