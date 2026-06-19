import type { Config } from "tailwindcss";

// Bank-grade palette from the pitch; keep usage restrained.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0E2841",
        gold: "#B58E3F",
        cream: "#F8F4EA",
        ink: "#27374A",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
