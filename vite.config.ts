import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import wasm from "vite-plugin-wasm";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), wasm()],
    build: {
        target: "esnext", // allow top-level await
    },
    optimizeDeps: {
        esbuildOptions: {
            target: "esnext",
        },
    },
});
