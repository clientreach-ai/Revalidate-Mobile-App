/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],

  // NativeWind uses class-based dark mode
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        /* ===== Brand ===== */
        primary: {
          DEFAULT: "#2b5f9e",
          50: "#e8f4f9",
          100: "#d1e9f3",
          200: "#a3d3e7",
          300: "#75b3db",
          400: "#4893cf",
          500: "#2596be",
          600: "#1f7ea6",
          700: "#1b6f8c",
          800: "#145363",
          900: "#0d3842",
        },

        /* ===== App Backgrounds ===== */
        background: {
          light: "#ffffff",
          dark: "#0b1220",
        },

        /* ===== Text ===== */
        foreground: {
          light: "#0f172a",
          dark: "#e5e7eb",
        },

        /* ===== Borders / Surfaces ===== */
        surface: {
          light: "#f8fafc",
          dark: "#111827",
        },
      },
    },
  },
  plugins: [],
};
