import type { IncomingMessage, ServerResponse } from "http";
import type { ViteDevServer, PluginOption } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "wasm-mime-fix",
      configureServer(server: ViteDevServer) {
        server.middlewares.use(
          (req: IncomingMessage, res: ServerResponse, next: () => void) => {
            if (req.url && req.url.endsWith(".wasm")) {
              res.setHeader("Content-Type", "application/wasm");
            }
            next();
          }
        );
      },
    } as PluginOption,
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    middlewareMode: false,
    fs: {
      strict: false,
    },
  },
  assetsInclude: ["**/*.wasm"],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
