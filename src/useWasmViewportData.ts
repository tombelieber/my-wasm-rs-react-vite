// src/useWasmViewportData.ts
import {
    FilterChangedEvent,
    FilterModel,
    IViewportDatasource,
    IViewportDatasourceParams,
    SortChangedEvent,
    SortDirection,
} from "ag-grid-community";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    query_indices,
    get_memory,
    get_object_size,
    get_objects_len,
    get_objects_ptr,
    update_time,
} from "wasm-shared-memory";
import { benchmark } from "./benchmark";
import { DataRowUI } from "./DataRowUI";
import { parseDataFromMemoryView } from "./wasmData";

type RowDataMap = {
    [index: number]: DataRowUI;
};

type WasmDataInfo = {
    dataView: DataView<ArrayBuffer>;
    len: number;
    objectSize: number;
};

/**
 * Helper function that reads WASM memory info and returns a DataView,
 * the total number of objects (len), and the object size.
 */
function getWasmDataInfo(): WasmDataInfo {
    const ptr = get_objects_ptr();
    const len = get_objects_len();
    const objectSize = get_object_size();
    const wasmMemory = get_memory() as WebAssembly.Memory;
    const dataView = new DataView(wasmMemory.buffer, ptr, len * objectSize);
    return { dataView, len, objectSize };
}

/**
 * New helper function: Given a Uint32Array of filtered & sorted indices,
 * and a viewport range (firstRow, lastRow), build a map of row data.
 * The queryIndices array provides the master data indices in the desired order.
 */
function getRowDataMapFromIndices(
    queryIndices: Uint32Array,
    firstRow: number,
    lastRow: number,
): RowDataMap {
    const { dataView, objectSize } = getWasmDataInfo();
    const rowDataMap: RowDataMap = {};
    // Loop over the visible range in the filtered/sorted indices.
    for (let i = firstRow; i <= lastRow && i < queryIndices.length; i++) {
        // queryIndices[i] gives the actual index into the master data.
        const masterIndex = queryIndices[i];
        rowDataMap[i] = parseDataFromMemoryView(
            masterIndex,
            objectSize,
            dataView,
        );
    }
    return rowDataMap;
}

type SortModel = { col_id: string; sort: string };

export type WasmViewportData = {
    viewportDatasource: IViewportDatasource;
    onFilterChanged: (event: FilterChangedEvent<DataRowUI>) => void;
    onSortChanged: ({ columns }: SortChangedEvent<DataRowUI>) => void;
};

export function useWasmViewportData(intervalMs = 1000): WasmViewportData {
    // Ref to store the AgGrid datasource parameters.
    const viewportParamsRef = useRef<IViewportDatasourceParams | null>(null);
    // Ref to store the current visible range (first and last row indexes).
    const viewportRangeRef = useRef<{ first: number; last: number }>({
        first: 0,
        last: -1,
    });

    const [filterState, setFilterState] = useState<FilterModel>({});
    const [sortState, setSortState] = useState<SortModel[]>([]);

    const onFilterChanged = (event: FilterChangedEvent<DataRowUI>) => {
        setFilterState(event.api.getFilterModel());
    };
    const onSortChanged = ({ columns }: SortChangedEvent<DataRowUI>) => {
        if (!columns) return;

        const sort_model: SortModel[] = columns
            .filter((col) => col.getSort())
            .map((item) => {
                const sort = item.getSort() as NonNullable<SortDirection>;
                return {
                    col_id: item.getId(),
                    sort,
                };
            });
        setSortState(sort_model);
    };

    // Set up an interval to update the visible rows every intervalMs.
    useEffect(() => {
        const intervalId = setInterval(() => {
            // Update WASM state (for example, update time and associated strings)
            benchmark(update_time);

            // Execute the query in WASM with the current filter and sort settings.
            const queryResult = benchmark(
                query_indices,
                filterState,
                sortState,
            );
            const memoryBuffer = get_memory().buffer;
            // Create a typed array view over the query result.
            const indices = new Uint32Array(
                memoryBuffer,
                queryResult.ptr,
                queryResult.len,
            );

            const params = viewportParamsRef.current;
            const range = viewportRangeRef.current;
            if (params && range.first <= range.last) {
                const { first, last } = range;
                // Use the query indices to build the row data for the visible range.
                const updatedRows: { [index: number]: DataRowUI } = benchmark(
                    getRowDataMapFromIndices,
                    indices,
                    first,
                    last,
                );
                benchmark(params.setRowData, updatedRows);
            }
            // Optionally, free queryResult memory if your API provides a free method.
            // queryResult.free();
        }, intervalMs);
        return () => clearInterval(intervalId);
    }, [filterState, intervalMs, sortState]);

    const viewportDatasource = useMemo<IViewportDatasource>(() => {
        return {
            /** Called once by AgGrid when the datasource is set. */
            init: (params: IViewportDatasourceParams) => {
                viewportParamsRef.current = params;
                // Set the total row count based on the master data.
                const { len } = getWasmDataInfo();
                params.setRowCount(len);
            },
            /** Called whenever the visible row range changes (e.g. user scrolls). */
            setViewportRange: (firstRow: number, lastRow: number) => {
                if (!viewportParamsRef.current) return;
                viewportRangeRef.current = { first: firstRow, last: lastRow };
                // You can also immediately update the viewport if desired:
                const queryResult = query_indices(filterState, sortState);
                const memoryBuffer = get_memory().buffer;
                const indices = new Uint32Array(
                    memoryBuffer,
                    queryResult.ptr,
                    queryResult.len,
                );
                const rowDataMap = getRowDataMapFromIndices(
                    indices,
                    firstRow,
                    lastRow,
                );
                benchmark(viewportParamsRef.current.setRowData, rowDataMap);
            },
            /** Called when the datasource is destroyed (optional cleanup). */
            destroy: () => {
                viewportParamsRef.current = null;
            },
        };
    }, [filterState, sortState]);

    return {
        viewportDatasource,
        onFilterChanged,
        onSortChanged,
    };
}
