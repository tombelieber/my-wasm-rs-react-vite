import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import init, { initThreadPool } from "wasm-shared-memory";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
