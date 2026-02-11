import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "414px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        urdu: ["'Noori Nastaleeq'", "'Noto Nastaliq Urdu'", "'Jameel Noori Nastaleeq'", 'serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Fast Haazir Brand Colors
        brand: {
          green: {
            50: "hsl(152, 77%, 95%)",
            100: "hsl(152, 77%, 85%)",
            200: "hsl(152, 77%, 70%)",
            300: "hsl(152, 77%, 55%)",
            400: "hsl(152, 77%, 45%)",
            500: "hsl(152, 77%, 35%)",
            600: "hsl(152, 77%, 26%)",
            700: "hsl(152, 77%, 22%)",
            800: "hsl(152, 77%, 18%)",
            900: "hsl(152, 77%, 12%)",
          },
          orange: {
            50: "hsl(38, 100%, 95%)",
            100: "hsl(38, 100%, 85%)",
            200: "hsl(38, 100%, 70%)",
            300: "hsl(38, 100%, 60%)",
            400: "hsl(28, 100%, 55%)",
            500: "hsl(28, 100%, 50%)",
            600: "hsl(18, 100%, 48%)",
            700: "hsl(12, 100%, 42%)",
            800: "hsl(8, 90%, 35%)",
            900: "hsl(4, 85%, 28%)",
          },
        },
        charcoal: {
          DEFAULT: "hsl(160, 20%, 12%)",
          light: "hsl(160, 15%, 18%)",
          dark: "hsl(160, 25%, 6%)",
        },
        success: {
          DEFAULT: "hsl(152, 77%, 35%)",
          light: "hsl(152, 77%, 45%)",
          dark: "hsl(152, 77%, 26%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.08)",
        card: "0 8px 30px rgba(0, 0, 0, 0.12)",
        elevated: "0 12px 40px rgba(255, 106, 0, 0.2)",
        glow: "0 0 30px rgba(255, 106, 0, 0.3)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-bottom": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 106, 0, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(255, 106, 0, 0.5)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shine: {
          "0%": { transform: "translateX(-150%) skewX(-12deg)" },
          "100%": { transform: "translateX(150%) skewX(-12deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-bottom": "slide-in-bottom 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s infinite",
        float: "float 3s ease-in-out infinite",
        shine: "shine 3s infinite linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
