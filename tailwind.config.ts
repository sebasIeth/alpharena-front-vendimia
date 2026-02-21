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
          bg: "#F5F7FB",
          card: "#FFFFFF",
          primary: "#6366F1",
          accent: "#F43F5E",
          text: "#1E293B",
          muted: "#64748B",
          success: "#10B981",
          border: "#E2E8F0",
          "card-hover": "#F1F5F9",
          "primary-dark": "#4F46E5",
          "primary-light": "#818CF8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "arena-sm": "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
        "arena": "0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
        "arena-lg": "0 10px 25px -3px rgba(99, 102, 241, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
        "arena-glow": "0 0 20px rgba(99, 102, 241, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
