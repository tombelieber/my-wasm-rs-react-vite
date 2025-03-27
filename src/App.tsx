// src/App.tsx
import {
    ColDef,
    FirstDataRenderedEvent,
    GridOptions,
    ModuleRegistry,
} from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import init, { initThreadPool, populate_objects } from "wasm-shared-memory";
import "./App.css";
import { useWasmViewportData } from "./useWasmViewportData";

// Register AgGrid community modules.
ModuleRegistry.registerModules([AllEnterpriseModule]);
console.log(`crossOriginIsolated`, self.crossOriginIsolated);
interface DataRow {
    id: number;
    value: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    g: number;
    h: number;
    time_ms: number;
}

// * WASM related part must be used in Worker, cannot start concurrent in Main Thread
await init().then(async () => {
    // await initThreadPool(navigator.hardwareConcurrency);
});

const NUM_OF_ROWS = 1000 * 1000;
// Populate the WASM objects once.
populate_objects(NUM_OF_ROWS);

// Define grid options with delta mode and unique row ID.
const gridOptions: GridOptions<DataRow> = {
    getRowId: ({ data }) => data.id.toString(),
    rowModelType: "viewport",
    viewportRowModelPageSize: 100,
    viewportRowModelBufferSize: 10,
};

const onFirstDataRendered = ({ api }: FirstDataRenderedEvent<DataRow>) => {
    api.autoSizeAllColumns();
};

function App() {
    // Use our hook to get the viewport datasource.
    const viewportDatasource = useWasmViewportData(1000);

    const columnDefs: ColDef<DataRow>[] = useMemo<ColDef<DataRow>[]>(
        () => [
            { headerName: "ID", field: "id" },
            { headerName: "Value", field: "value" },
            {
                headerName: "Time (ms)",
                field: "time_ms",
                valueFormatter: ({ data }) =>
                    new Date(data?.time_ms ?? 0).toISOString(),
            },
            { headerName: "A", field: "a" },
            { headerName: "B", field: "b" },
            { headerName: "C", field: "c" },
            { headerName: "D", field: "d" },
            { headerName: "E", field: "e" },
            { headerName: "F", field: "f" },
            { headerName: "G", field: "g" },
            { headerName: "H", field: "h" },
        ],
        [],
    );

    return (
        <div className="App">
            <h1>
                WASM Shared Memory with AgGrid (Vite + React + TS)
                <br />
                (11 fields, 1M items benchmark with time updates)
            </h1>
            <div
                className="ag-theme-alpine"
                style={{ height: 400, width: 800 }}
            >
                <AgGridReact
                    gridOptions={gridOptions}
                    columnDefs={columnDefs}
                    viewportDatasource={viewportDatasource}
                    onFirstDataRendered={onFirstDataRendered}
                />
            </div>
        </div>
    );
}

export default App;
