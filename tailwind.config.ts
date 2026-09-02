import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#10192f",
          dark: "#0a0f1d",
          light: "#e9ebf2",
        },
        accent: {
          DEFAULT: "#c9a24b",
          dark: "#a3811f",
          light: "#f7ecd3",
        },
      },
      fontFamily: {
        display: ["'Shippori Mincho'", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
