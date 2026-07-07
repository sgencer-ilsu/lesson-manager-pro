import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f172a",
        panel: "#111827",
        panel2: "#172033",
        line: "#26364f",
        accent: "#2563eb",
        muted: "#94a3b8",
      },
    },
  },
  plugins: [],
};
export default config;
