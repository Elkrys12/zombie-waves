import { defineConfig } from "vite";

export default defineConfig({
  // En GitHub Pages el sitio vive en /zombie-waves/; en local, en la raíz
  base: process.env.VITE_BASE ?? "/",
  server: { port: 5173, host: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { phaser: ["phaser"] },
      },
    },
  },
});
