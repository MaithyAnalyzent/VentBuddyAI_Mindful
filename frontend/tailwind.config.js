/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "#E5E0D8",
        input: "#E5E0D8",
        ring: "#8A9A86",
        background: "#F7F1E6",
        foreground: "#22312D",
        primary: {
          DEFAULT: "#22312D",
          foreground: "#FDFBF7",
        },
        secondary: {
          DEFAULT: "#E9E2D6",
          foreground: "#22312D",
        },
        destructive: {
          DEFAULT: "#A24D45",
          foreground: "#FDFBF7",
        },
        accent: {
          DEFAULT: "#E8EFE4",
          foreground: "#22312D",
        },
        muted: {
          DEFAULT: "#E9E2D6",
          foreground: "#6B7B72",
        },
        sand: {
          50: "#FDFBF7",
          100: "#F7F1E6",
          200: "#EDE5D8",
        },
        ink: {
          600: "#5E6C66",
          900: "#22312D",
        },
        sage: {
          100: "#E7EFE3",
          400: "#8A9A86",
          500: "#75866F",
          700: "#5E7059",
        },
        terracotta: {
          400: "#A24D45",
        },
        crisis: "#A24D45",
        sleep: {
          text: "#F7F1E6",
          card: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        heading: ["Outfit", "DM Sans", "Inter", "system-ui", "sans-serif"],
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.45" },
          "100%": { transform: "scale(1.75)", opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
