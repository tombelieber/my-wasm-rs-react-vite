// src/useWasmData.ts
import { useEffect, useRef } from "react";
import { DataRow, updateWasmData } from "./wasmData";
import { GridApi } from "ag-grid-community";

/**
 * A custom hook that polls WASM memory every intervalMs milliseconds
 * and returns a function to update the grid data.
 */
export function useWasmData(intervalMs = 1000): (gridApi: GridApi<DataRow>) => void {
    const lastUpdateRef = useRef<number>(0);
    const gridApiRef = useRef<GridApi<DataRow> | null>(null);
    const isFirstUpdateRef = useRef(true);

    useEffect(() => {
        const updateData = () => {
            const now = performance.now();
            if (now - lastUpdateRef.current >= intervalMs) {
                const newData = updateWasmData();
                if (newData && gridApiRef.current) {
                    if (isFirstUpdateRef.current) {
                        // First update: add all rows
                        gridApiRef.current.applyTransaction({ add: newData });
                        isFirstUpdateRef.current = false;
                    } else {
                        // Subsequent updates: update existing rows
                        gridApiRef.current.applyTransaction({ update: newData });
                    }
                    lastUpdateRef.current = now;
                }
            }
        };

        // Do an initial update
        updateData();

        // Set up interval for subsequent updates
        const intervalId = setInterval(updateData, intervalMs);

        return () => {
            clearInterval(intervalId);
        };
    }, [intervalMs]);

    return (gridApi: GridApi<DataRow>) => {
        gridApiRef.current = gridApi;
    };
}
