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
          bg: "#0A0A0F",
          "bg-light": "#12121A",
          "bg-card": "#16161F",
          card: "#1A1A25",
          "card-hover": "#22222F",
          primary: "#00F0FF",
          "primary-dark": "#00C4D0",
          "primary-light": "#33F5FF",
          accent: "#FFB800",
          "accent-light": "#FFCB40",
          danger: "#F43F5E",
          text: "#E8E8ED",
          "text-bright": "#FFFFFF",
          muted: "#6B7280",
          "muted-light": "#9CA3AF",
          success: "#10B981",
          border: "#2A2A3A",
          "border-light": "#3A3A4A",
        },
      },
      fontFamily: {
        display: ["'Clash Display'", "'Cabinet Grotesk'", "system-ui", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "'General Sans'", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "arena-sm": "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
        arena: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)",
        "arena-lg": "0 10px 25px -3px rgba(0, 240, 255, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.2)",
        "arena-glow": "0 0 20px rgba(0, 240, 255, 0.15)",
        "arena-glow-strong": "0 0 40px rgba(0, 240, 255, 0.25), 0 0 80px rgba(0, 240, 255, 0.1)",
        "arena-amber": "0 0 20px rgba(255, 184, 0, 0.15)",
        "arena-amber-strong": "0 0 40px rgba(255, 184, 0, 0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "fade-down": "fadeDown 0.4s ease-out forwards",
        "scale-in": "scaleIn 0.5s ease-out forwards",
        "slide-right": "slideRight 0.6s ease-out forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "float-slower": "float 10s ease-in-out infinite",
        "spin-slow": "spin 20s linear infinite",
        "grid-flow": "gridFlow 20s linear infinite",
        "draw-line": "drawLine 1.5s ease-out forwards",
        "count-up": "countUp 2s ease-out forwards",
        "typewriter": "typewriter 3s steps(60) forwards",
        "glitch": "glitch 0.8s ease-out forwards",
        "border-glow": "borderGlow 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 240, 255, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(0, 240, 255, 0.3), 0 0 80px rgba(0, 240, 255, 0.1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-10px) rotate(1deg)" },
          "66%": { transform: "translateY(5px) rotate(-1deg)" },
        },
        gridFlow: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        drawLine: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glitch: {
          "0%": { transform: "translate(0)", opacity: "0" },
          "10%": { transform: "translate(-2px, 2px)", opacity: "0.8" },
          "20%": { transform: "translate(2px, -2px)", opacity: "0.6" },
          "30%": { transform: "translate(-1px, -1px)", opacity: "0.9" },
          "40%": { transform: "translate(1px, 1px)", opacity: "0.7" },
          "50%": { transform: "translate(-1px, 2px)", opacity: "1" },
          "60%": { transform: "translate(1px, -1px)" },
          "70%": { transform: "translate(0)" },
          "100%": { transform: "translate(0)", opacity: "1" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(0, 240, 255, 0.3)" },
          "50%": { borderColor: "rgba(0, 240, 255, 0.6)" },
        },
        typewriter: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
