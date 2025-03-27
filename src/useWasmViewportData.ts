// src/useWasmViewportData.ts
import { useEffect, useMemo, useRef } from "react";
import {
    IViewportDatasource,
    IViewportDatasourceParams,
} from "ag-grid-community";
import { DataRow, updateWasmData } from "./wasmData";

/**
 * A custom hook that creates a stable viewport datasource for AgGrid.
 * It uses internal refs to store the full dataset and the current viewport range,
 * and sets up a timer (1s interval) to update the visible rows.
 */
export function useWasmViewportData(intervalMs = 1000): IViewportDatasource {
    // Holds the full dataset (100k+ rows) without causing React re-renders.
    const dataRef = useRef<DataRow[]>([]);
    // Stores the AgGrid datasource parameters (used to push row updates).
    const viewportParamsRef = useRef<IViewportDatasourceParams | null>(null);
    // Stores the current visible range (first and last row indexes).
    const viewportRangeRef = useRef<{ first: number; last: number }>({
        first: 0,
        last: -1,
    });

    // On mount, get the initial full snapshot from WASM.
    useEffect(() => {
        dataRef.current = updateWasmData();
    }, []);

    // Set up an interval to update the visible rows every intervalMs.
    useEffect(() => {
        const intervalId = setInterval(() => {
            // Get the latest snapshot from WASM.
            const newData = updateWasmData();
            dataRef.current = newData;
            const params = viewportParamsRef.current;
            const range = viewportRangeRef.current;
            if (params && range.first <= range.last) {
                const { first, last } = range;
                const updatedRows: { [rowIndex: number]: DataRow } = {};
                for (
                    let i = first;
                    i <= last && i < dataRef.current.length;
                    i++
                ) {
                    updatedRows[i] = dataRef.current[i];
                }
                // Update only the visible rows.
                params.setRowData(updatedRows);
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
                const data = dataRef.current;
                // Inform the grid of the total row count.
                params.setRowCount(data.length);
                // We don't call setRowData here—the grid will invoke setViewportRange.
            },
            /** Called whenever the visible row range changes (e.g. user scrolls). */
            setViewportRange: (firstRow: number, lastRow: number) => {
                viewportRangeRef.current = { first: firstRow, last: lastRow };
                const rowDataMap: { [index: number]: DataRow } = {};
                for (
                    let i = firstRow;
                    i <= lastRow && i < dataRef.current.length;
                    i++
                ) {
                    rowDataMap[i] = dataRef.current[i];
                }
                viewportParamsRef.current?.setRowData(rowDataMap);
            },
            /** Called when the datasource is destroyed (optional cleanup). */
            destroy: () => {
                viewportParamsRef.current = null;
            },
        };
    }, []);

    return viewportDatasource;
}
