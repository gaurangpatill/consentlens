import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { manifest } from "./src/manifest";

function manifestPlugin(): Plugin {
  return {
    name: "consentlens-manifest",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(manifest, null, 2)
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), manifestPlugin()],
  define: {
    __USE_LLM_ANALYZER__: JSON.stringify(process.env.USE_LLM_ANALYZER === "true"),
    __LLM_ANALYZER_ENDPOINT__: JSON.stringify(process.env.LLM_ANALYZER_ENDPOINT ?? "")
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        options: resolve(__dirname, "options.html")
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
