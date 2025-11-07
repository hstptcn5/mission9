/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'monad-purple': '#8B008B',
        'monad-blue': '#1E90FF',
      },
    },
  },
  plugins: [],
}

