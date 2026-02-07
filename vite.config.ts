import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "qwyzs9-5174.csb.app", // This allows the specific host in your error
    ],
  },
});
