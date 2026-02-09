import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/BCOFD-Fire-Command-Board/", // This is the repo name for GitHub Pages
  server: {
    allowedHosts: ["qwyzs9-5173.csb.app"],
  },
});
