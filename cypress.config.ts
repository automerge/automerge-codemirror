import { defineConfig } from "cypress"
import react from "@vitejs/plugin-react"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"

export default defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig: {
        plugins: [wasm(), topLevelAwait(), react()],

        server: {
          fs: {
            strict: false,
          },
        },
      },
    },
  },
})
