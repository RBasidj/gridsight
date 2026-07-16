import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f4f1ea",
          raised: "#faf8f3",
          sunken: "#eae4d7",
        },
        ink: {
          DEFAULT: "#211d17",
          muted: "#524d42",
          faint: "#807a6b",
        },
        rule: {
          DEFAULT: "#d8d1c1",
          strong: "#c3b9a4",
        },
        forest: {
          DEFAULT: "#1f5c3d",
          soft: "#2f7d4f",
        },
      },
      fontFamily: {
        display: ["Georgia", "'Iowan Old Style'", "'Times New Roman'", "serif"],
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "'SF Mono'", "'Roboto Mono'", "Menlo", "monospace"],
      },
      borderRadius: {
        none: "0",
        DEFAULT: "2px",
        sm: "1px",
      },
    },
  },
  plugins: [],
};

export default config;
