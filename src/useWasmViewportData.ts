// src/useWasmViewportData.ts
import {
    IViewportDatasource,
    IViewportDatasourceParams,
} from "ag-grid-community";
import { useEffect, useMemo, useRef } from "react";
import {
    get_memory,
    get_object_size,
    get_objects_len,
    get_objects_ptr,
    update_time,
} from "wasm-shared-memory";
import { benchmark } from "./benchmark";
import { DataRowUI } from "./DataRowUI";
import { parseDataFromMemoryView } from "./wasmData";

function getRowDataMap(firstRow: number, lastRow: number) {
    const { dataView, len, objectSize } = getWasmDataInfo();
    const rowDataMap: { [index: number]: DataRowUI } = {};
    for (let i = firstRow; i <= lastRow && i < len; i++) {
        rowDataMap[i] = parseDataFromMemoryView(i, objectSize, dataView);
    }
    return rowDataMap;
}

/**
 * Helper function that reads WASM memory info and returns a DataView,
 * the total number of objects (len), and the object size.
 */
function getWasmDataInfo() {
    const ptr = get_objects_ptr();
    const len = get_objects_len();
    const objectSize = get_object_size();
    const wasmMemory = get_memory() as WebAssembly.Memory;
    const dataView = new DataView(wasmMemory.buffer, ptr, len * objectSize);
    return { dataView, len, objectSize };
}

/**
 * A custom hook that creates a stable viewport datasource for AgGrid
 * and sets up a timer (1s interval) to update the visible rows.
 */
export function useWasmViewportData(intervalMs = 1000): IViewportDatasource {
    // Ref to store the AgGrid datasource parameters.
    const viewportParamsRef = useRef<IViewportDatasourceParams | null>(null);
    // Ref to store the current visible range (first and last row indexes).
    const viewportRangeRef = useRef<{ first: number; last: number }>({
        first: 0,
        last: -1,
    });

    // Set up an interval to update the visible rows every intervalMs.
    useEffect(() => {
        const intervalId = setInterval(() => {
            // Update the time in WASM memory (which also updates the string, etc.)
            benchmark(update_time);
            const params = viewportParamsRef.current;
            const range = viewportRangeRef.current;
            if (params && range.first <= range.last) {
                const { first, last } = range;
                // Prepare an updated rows array for the visible range.
                const updatedRows: { [index: number]: DataRowUI } = benchmark(
                    getRowDataMap,
                    first,
                    last,
                );
                console.debug({ updatedRows });
                // Push the updated visible rows to the grid.
                benchmark(params.setRowData, updatedRows);
            }
        }, intervalMs);
        return () => clearInterval(intervalId);
    }, [intervalMs]);

    // Memoize a stable viewport datasource object.
    const viewportDatasource = useMemo<IViewportDatasource>(() => {
        return {
            /** Called once by AgGrid when the datasource is set. */
            init: (params: IViewportDatasourceParams) => {
                viewportParamsRef.current = params;
                // Set the total row count from WASM.
                const { len } = getWasmDataInfo();
                params.setRowCount(len);
            },
            /** Called whenever the visible row range changes (e.g. user scrolls). */
            setViewportRange: (firstRow: number, lastRow: number) => {
                if (!viewportParamsRef.current) return;
                viewportRangeRef.current = { first: firstRow, last: lastRow };
                const rowDataMap: { [index: number]: DataRowUI } = benchmark(
                    getRowDataMap,
                    firstRow,
                    lastRow,
                );
                console.debug({ rowDataMap });
                benchmark(viewportParamsRef.current.setRowData, rowDataMap);
            },
            /** Called when the datasource is destroyed (optional cleanup). */
            destroy: () => {
                viewportParamsRef.current = null;
            },
        };
    }, []);

    return viewportDatasource;
}
