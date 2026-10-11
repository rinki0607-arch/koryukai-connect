import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#D6304A",
          dark: "#B8243D",
          light: "#FFE6EA",
        },
        accent: {
          DEFAULT: "#E0A63E",
          dark: "#A3811F",
          light: "#FFF3DC",
        },
      },
      fontFamily: {
        display: ["'M PLUS Rounded 1c'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
