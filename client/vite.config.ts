import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { lingui } from "@lingui/vite-plugin";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    lingui(),
    react({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  publicDir: "public",
  build: {
    outDir: "dist",
    ssr: true,
    rollupOptions: {
      input: {
        client: resolve(__dirname, "src/entry-client.tsx"),
        server: resolve(__dirname, "src/entry-server.tsx"),
      },
    },
  },
  server: {
    port: 5174,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
      },
    },
  },
  ssr: {
    noExternal: ["react-router-dom"],
  },
});
