
/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF9F5",
        "top-bar": "#FFFFFF",
        border: "#E2E8F0",
        meta: "#4A5568",
        "action-resolve": "#0B4F6C",
        "action-flag": "#D34026",
        "health-green": "#2D7A5D",
        "alert-badge": "#D34026",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
