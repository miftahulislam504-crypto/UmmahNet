/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        midnight: {
          DEFAULT: "#0f0d1a",
          50:  "#1a1730",
          100: "#16132a",
          200: "#120f22",
          300: "#0f0d1a",
        },
        royal: {
          DEFAULT: "#7c3aed",
          light:   "#9f67fa",
          dark:    "#5b21b6",
        },
        emerald: {
          500: "#10b981",
          600: "#059669",
        },
        gold: {
          DEFAULT: "#d97706",
          light:   "#fbbf24",
        },
        surface: {
          DEFAULT: "#ffffff",
          dark:    "#0f0d1a",
          card:    "rgba(255,255,255,0.06)",
          "card-light": "rgba(255,255,255,0.85)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "royal-gradient": "linear-gradient(135deg, #0f0d1a 0%, #1a1040 40%, #2d1b69 70%, #0f0d1a 100%)",
        "card-gradient":  "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(30,27,75,0.1) 100%)",
        "btn-gradient":   "linear-gradient(135deg, #7c3aed 0%, #9f67fa 100%)",
        "gold-gradient":  "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
      },
      animation: {
        "float-slow":    "floatSlow 8s ease-in-out infinite",
        "float-medium":  "floatMedium 6s ease-in-out infinite",
        "pulse-glow":    "pulseGlow 3s ease-in-out infinite",
        "gradient-move": "gradientMove 12s ease infinite",
        "fade-up":       "fadeUp 0.4s ease-out",
        "fade-in":       "fadeIn 0.3s ease-out",
        "slide-up":      "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
        "particle":      "particle 20s linear infinite",
        "spin-slow":     "spin 20s linear infinite",
      },
      keyframes: {
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%":      { transform: "translateY(-18px) rotate(1deg)" },
          "66%":      { transform: "translateY(-8px) rotate(-1deg)" },
        },
        floatMedium: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%":      { opacity: "1",   transform: "scale(1.05)" },
        },
        gradientMove: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(24px) scale(0.97)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        particle: {
          "0%":   { transform: "translateY(100vh) translateX(0px)", opacity: "0" },
          "10%":  { opacity: "1" },
          "90%":  { opacity: "1" },
          "100%": { transform: "translateY(-100px) translateX(60px)", opacity: "0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glow-purple": "0 0 20px rgba(124,58,237,0.35), 0 0 60px rgba(124,58,237,0.1)",
        "glow-sm":     "0 0 10px rgba(124,58,237,0.25)",
        "card":        "0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)",
        "card-hover":  "0 8px 32px rgba(124,58,237,0.2), 0 2px 8px rgba(0,0,0,0.15)",
        "float":       "0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(124,58,237,0.15)",
        "nav":         "0 -1px 0 rgba(255,255,255,0.06), 0 -8px 32px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};
