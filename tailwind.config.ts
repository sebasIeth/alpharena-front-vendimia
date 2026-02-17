import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: "#0F0F0F",
          card: "#1A1A2E",
          primary: "#C19A3E",
          accent: "#E74C3C",
          text: "#F4E8C1",
          muted: "#8B8B8B",
          success: "#2ECC71",
          border: "#2A2A3E",
          "card-hover": "#222240",
          "primary-dark": "#A07E2E",
          "primary-light": "#D4AF5A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
