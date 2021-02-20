import { resolve } from "path";
import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import { injectManifest } from "rollup-plugin-workbox";

export default defineConfig(({ mode }) => ({
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    reactRefresh(),
    injectManifest(
      {
        swSrc: "./src/sw.js",
        swDest: "./dist/sw.js",
        dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
        globDirectory: "dist",
        mode,
        modifyURLPrefix: { assets: "/assets" },
      },
      () => {}
    ) as any,
  ],
}));
