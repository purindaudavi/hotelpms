import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--theme-ink-rgb) / <alpha-value>)",
        mist: "rgb(var(--theme-mist-rgb) / <alpha-value>)",
        line: "rgb(var(--theme-line-rgb) / <alpha-value>)",
        ocean: "#0ea5e9",
        violet: "#6d5dfc",
        amber: "#f59e0b",
        mint: "#10b981"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.08), 0 10px 24px rgba(15, 23, 42, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
