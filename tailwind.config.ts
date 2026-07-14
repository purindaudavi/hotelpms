import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14161a",
        mist: "#f4f7fb",
        line: "#e6ebf2",
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

