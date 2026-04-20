module.exports = {
  content: [
    "./_includes/**/*.html",
    "./_layouts/**/*.html",
    "./pages/**/*.{html,md}",
    "./_projects-2022/**/*.{html,md}",
    "./_projects-2023/**/*.{html,md}",
    "./_projects-2025/**/*.{html,md}",
    "./_acknowledgements/**/*.{html,md}"
  ],
  theme: {
    extend: {
      colors: {
        templeCherry: "#9D2235",
        platformBlue: "#1f4ed8",
        platformBlueDark: "#14389b",
        platformSky: "#eff6ff",
        platformBorder: "#dbe4f0",
        platformText: "#102033",
        platformMuted: "#5d6b82",
        platformBg: "#f6f8fc",
        gold: "#f1c453"
      },
      fontFamily: {
        sans: [
          "Avenir Next",
          "Avenir",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ],
        display: [
          "Georgia",
          "Iowan Old Style",
          "Palatino Linotype",
          "Book Antiqua",
          "Times New Roman",
          "serif"
        ]
      },
      boxShadow: {
        soft: "0 18px 40px -24px rgba(16, 32, 51, 0.18)",
        panel: "0 10px 30px -18px rgba(16, 32, 51, 0.16)"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};
