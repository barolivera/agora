/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        cream: "var(--color-cream)",
        orange: {
          DEFAULT: "var(--color-orange)",
          light: "var(--color-orange-light)",
        },
        cobalt: {
          DEFAULT: "var(--color-cobalt)",
          light: "var(--color-cobalt-light)",
        },
        ink: "var(--color-ink)",
        yellow: "var(--color-yellow)",
        "warm-gray": "var(--color-warm-gray)",
        primary: "#7C3AED",
        "primary-light": "#F3F0FF",
        success: "#059669",
        border: "#E5E7EB",
        surface: "#F9FAFB",
      },
    },
  },
  plugins: [],
}