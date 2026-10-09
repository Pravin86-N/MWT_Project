import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = process.env.BACKEND_URL || env.BACKEND_URL || env.VITE_BACKEND_URL || "";

  return {
    plugins: [react()],
    define: {
      "process.env.BACKEND_URL": JSON.stringify(backendUrl),
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      watch: {
        ignored: ["**/report_builder/**", "**/report_assets/**", "**/chrome_profile/**"],
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("leaflet") || id.includes("react-leaflet")) {
                return "vendor-maps";
              }
              if (id.includes("lucide-react")) {
                return "vendor-icons";
              }
              if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
                return "vendor-react";
              }
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});

