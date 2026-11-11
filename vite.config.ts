import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Automatically boot the Express scientific backend on port 5000 during `vite dev`
 * so the user can simply run `npm run dev` and have both frontend and backend active!
 */
function spherexBackendPlugin(): Plugin {
  let backendServer: any = null;
  return {
    name: "spherex-backend-plugin",
    configureServer() {
      import("./server/server.js")
        .then(({ startServer }) => {
          backendServer = startServer(5000, "0.0.0.0", false);
        })
        .catch((err) => {
          console.error("Failed to auto-start SPHEREx backend server:", err);
        });
    },
    buildEnd() {
      if (backendServer && typeof backendServer.close === "function") {
        backendServer.close();
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), spherexBackendPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
