import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "wa-green": "#25D366",
        "wa-dark": "#075E54",
        "wa-bg": "#ECE5DD",
        "wa-bubble-in": "#FFFFFF",
        "wa-bubble-out": "#DCF8C6",
      },
    },
  },
  plugins: [],
};

export default config;
