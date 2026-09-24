/** @type {import('tailwindcss').Config} */
export default {
  // Scan all component, page, and feature files for class names
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#071e3d",
          navyDark: "#001230",
          navyDeep: "#0a2540",
          orange: "#f58220",
          orangeHover: "#e06d10",
          orangeLight: "#ff7a00",
          orangeSubtle: "#fff7ed",
        },
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', "Inter", "sans-serif"],
        heading: ['"Be Vietnam Pro"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
