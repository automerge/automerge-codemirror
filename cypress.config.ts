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

        // Ensure a single instance of each CodeMirror package in the bundle.
        // Without this, `undo`/`redo` (from @codemirror/commands) can resolve
        // to a different copy than the `history()` installed by basicSetup,
        // so they look for a historyField that isn't there and silently do
        // nothing. See https://codemirror.net/docs/community/#multiple-instances
        resolve: {
          dedupe: [
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/commands",
          ],
        },

        server: {
          fs: {
            strict: false,
          },
        },
      },
    },
  },
})
