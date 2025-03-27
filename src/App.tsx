// src/App.tsx
import {
    ColDef,
    GridApi,
    GridOptions,
    GridReadyEvent,
    ModuleRegistry,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridReact } from "ag-grid-react";
import { populate_objects } from "wasm-shared-memory";
import "./App.css";
import { useWasmData } from "./useWasmData";
import { useMemo, useRef } from "react";
import { AllEnterpriseModule } from "ag-grid-enterprise";

// Register AgGrid community modules.
ModuleRegistry.registerModules([AllEnterpriseModule]);

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

const NUM_OF_ROWS = 10 * 1000;
// Populate the WASM objects once.
populate_objects(NUM_OF_ROWS);

// Define grid options with delta mode and unique row ID.
const gridOptions: GridOptions<DataRow> = {
    getRowId: ({ data }) => data.id.toString(),
};

function App() {
    const gridApiRef = useRef<GridApi<DataRow> | null>(null);
    const updateGridRef = useWasmData(1000);

    const onGridReady = (params: GridReadyEvent<DataRow>) => {
        gridApiRef.current = params.api;
        updateGridRef(params.api);
    };

    const columnDefs: ColDef<DataRow>[] = useMemo(
        () => [
            { headerName: "ID", field: "id" },
            { headerName: "Value", field: "value" },
            {
                headerName: "Time (ms)",
                field: "time_ms",
                valueFormatter: ({ data }) =>
                    new Date(data?.time_ms ?? 0).toLocaleTimeString(),
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

    const statusBar = useMemo(
        () => ({
            statusPanels: [
                { statusPanel: "agTotalAndFilteredRowCountComponent" },
                { statusPanel: "agTotalRowCountComponent" },
                { statusPanel: "agFilteredRowCountComponent" },
                { statusPanel: "agSelectedRowCountComponent" },
                { statusPanel: "agAggregationComponent" },
            ],
        }),
        [],
    );

    return (
        <div className="App">
            <h1>
                WASM Shared Memory with AgGrid (Vite + React + TS)
                <br />
                (11 fields, 10k items benchmark with time updates)
            </h1>
            <div
                className="ag-theme-alpine"
                style={{ height: 400, width: 800 }}
            >
                <AgGridReact
                    gridOptions={gridOptions}
                    columnDefs={columnDefs}
                    onGridReady={onGridReady}
                    statusBar={statusBar}
                />
            </div>
        </div>
    );
}

export default App;
