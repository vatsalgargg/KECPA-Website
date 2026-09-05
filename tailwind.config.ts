import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: ["./components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kecpa: {
          navy: "#0a1628",
          orange: "#f7891d",
          surface: "#f3ede4",
        },
      },
    },
  },
  plugins: [],
} satisfies Config
