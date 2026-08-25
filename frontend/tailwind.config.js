/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
      },
      backgroundImage: {
        "app-gradient": "linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 45%, #f5f3ff 100%)",
        "brand-gradient": "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)",
        "header-gradient": "linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(236,253,245,0.88) 100%)",
      },
    },
  },
  plugins: [],
};
