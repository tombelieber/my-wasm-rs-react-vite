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
import { get_memory, populate_objects } from "wasm-shared-memory";
import "./App.css";
import { useWasmViewportData } from "./useWasmViewportData";
import { DataRowUI } from "./DataRowUI";

// Register AgGrid enterprise modules.
ModuleRegistry.registerModules([AllEnterpriseModule]);

// const NUM_OF_ROWS = 1000 * 1000;
const NUM_OF_ROWS = 10 * 1000;
populate_objects(NUM_OF_ROWS);

const gridOptions: GridOptions<DataRowUI> = {
    getRowId: ({ data }) => data.id.toString(),
    rowModelType: "viewport",
    viewportRowModelPageSize: 10,
    viewportRowModelBufferSize: 0,
};

const onFirstDataRendered = ({ api }: FirstDataRenderedEvent<DataRowUI>) => {
    api.autoSizeAllColumns();
};

function App() {
    // Use our hook to get the viewport datasource.
    const viewportDatasource = useWasmViewportData(1000);

    const columnDefs: ColDef<DataRowUI>[] = useMemo<ColDef<DataRowUI>[]>(
        () => [
            { headerName: "ID", field: "id" },
            { headerName: "Value", field: "value" },
            {
                headerName: "Time (ms)",
                field: "time_ms",
                valueFormatter: ({ data }) =>
                    new Date(data?.time_ms ?? 0).toISOString(),
            },
            {
                headerName: "Name",
                field: "name", // dummy field; we use custom renderer
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

    // Pass the WASM memory via grid context.
    const gridContext = useMemo(
        () => ({ wasmMemory: get_memory() as WebAssembly.Memory }),
        [],
    );

    return (
        <div className="App">
            <h1>
                WASM Shared Memory with AgGrid (Vite + React + TS)
                <br />
                (13 fields with a lazy UTF-8 string, 10k items)
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
                    context={gridContext}
                />
            </div>
        </div>
    );
}

export default App;
