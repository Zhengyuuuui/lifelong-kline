const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lifeBook/**/*.{ts,tsx}",
    "./revenueForecast/**/*.{ts,tsx}",
    "./SmoothSailingToday/**/*.{ts,tsx}",
    "./valuationOriented/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "380px",
      },
      transitionDuration: {
        280: "280ms",
        420: "420ms",
        1500: "1500ms",
        2500: "2500ms",
      },
      transitionTimingFunction: {
        "book-flip": "cubic-bezier(0.22, 1, 0.36, 1)",
        "app-panel": "cubic-bezier(0.23, 1, 0.32, 1)",
        "spotlight": "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "receipt": "cubic-bezier(0.2, 0.8, 0.2, 1)",
        sheet: "cubic-bezier(0.16, 1, 0.3, 1)",
        "sheet-spring": "cubic-bezier(0.19, 1, 0.22, 1)",
        dock: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      colors: {
        "bank-red": "#E60012",
        "bank-blue": "#1A365D",
        "bank-bg": "#F5F6F7",
        "bank-text": "#333333",
        "bank-gray": "#999999",
        "bank-green": "#07C160",
        "cn-red": "#D92332",
        "cn-gold": "#F2C97D",
        champagne: "#F2C97D",
      },
      fontFamily: {
        sans: ["var(--app-font-sans)"],
        serif: ["var(--app-font-serif)"],
        "serif-sc": ["var(--app-font-serif)"],
        "serif-display": ["var(--app-font-serif)"],
        "serif-elegant": ["var(--app-font-serif)"],
        "serif-gold": ["var(--app-font-serif)"],
        mono: [
          "SF Mono",
          "Menlo",
          "Monaco",
          "DIN Alternate",
          "PingFang SC",
          "Hiragino Sans GB",
          "monospace",
        ],
        "mono-tech": [
          "SF Mono",
          "Menlo",
          "Monaco",
          "DIN Alternate",
          "PingFang SC",
          "Hiragino Sans GB",
          "monospace",
        ],
        num: [
          "DIN Alternate",
          "SF Mono",
          "Menlo",
          "Monaco",
          "PingFang SC",
          "Hiragino Sans GB",
          "sans-serif",
        ],
        calligraphy: [
          "Kaiti SC",
          "KaiTi",
          "STKaiti",
          "Songti SC",
          "STSong",
          "var(--app-font-serif)",
        ],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translate3d(0, 12px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out both",
        "fade-in-up": "fade-in-up 280ms cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.1s ease-out both",
      },
    },
  },
  plugins: [animate],
};
