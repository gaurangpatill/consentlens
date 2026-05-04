import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    __USE_LLM_ANALYZER__: JSON.stringify(process.env.USE_LLM_ANALYZER === "true"),
    __LLM_ANALYZER_ENDPOINT__: JSON.stringify(process.env.LLM_ANALYZER_ENDPOINT ?? "")
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/content/index.ts"),
      name: "ConsentLensContent",
      formats: ["iife"],
      fileName: () => "content.js"
    },
    rollupOptions: {
      output: {
        extend: true
      }
    }
  }
});
