import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        appbg: "#0A0A0A",
        surface: "#1D1D1D",
        surface2: "#2D2D2D",
        lime: "#D5FF5F",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 24px rgba(0, 0, 0, 0.25)",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 250ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
