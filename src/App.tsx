// src/App.tsx
import { ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { useState } from "react";
import "./App.css";
import { JSGrid } from "./components/JSGrid";
import { Navbar } from "./components/Navbar";
import { WasmGrid } from "./components/WasmGrid";
import { formatNumber } from "./formatNumber";

// Register AgGrid Enterprise modules.
ModuleRegistry.registerModules([AllEnterpriseModule]);

// For this example, we use 10k rows.
export const NUM_OF_ROWS = 1000 * 1000;

function App() {
    const [activeMode, setActiveMode] = useState<"wasm" | "js">("js");

    return (
        <div className="App">
            <header className="app-header">
                <h1>
                    {activeMode === "wasm" ? "WASM" : "JS"} Shared Memory with
                    AgGrid (Vite + React + TS)
                    <br />
                    (13 fields with a lazy UTF-8 string,{" "}
                    {formatNumber(NUM_OF_ROWS)} items)
                </h1>
            </header>
            <Navbar activeMode={activeMode} onModeChange={setActiveMode} />
            <main className="grid-container">
                {activeMode === "wasm" ? (
                    <WasmGrid NUM_OF_ROWS={NUM_OF_ROWS} />
                ) : (
                    <JSGrid NUM_OF_ROWS={NUM_OF_ROWS} />
                )}
            </main>
        </div>
    );
}

export default App;
