import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// In development the browser talks to Vite (same origin) and Vite forwards to the API,
// so cookies work without any CORS setup. In production, VITE_API_ORIGIN points at the deployed API.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
      "/uploads": "http://localhost:5000",
    },
  },
});
