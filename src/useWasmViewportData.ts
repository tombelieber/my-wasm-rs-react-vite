// src/useWasmViewportData.ts
import {
    FilterChangedEvent,
    IViewportDatasource,
    IViewportDatasourceParams,
    SortChangedEvent,
    SortDirection,
    TextFilterModel,
} from "ag-grid-community";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
    get_memory,
    get_object_size,
    get_objects_len,
    get_objects_ptr,
    query_indices,
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
 * Given a Uint32Array of filtered & sorted indices and a viewport range,
 * build a map of row data. The queryIndices array provides the master data indices.
 */
function getRowDataMapFromIndices(
    queryIndices: Uint32Array,
    firstRow: number,
    lastRow: number,
): RowDataMap {
    const rowDataMap: RowDataMap = {};
    // If there are no filtered rows, return an empty map immediately.
    if (queryIndices.length === 0 || firstRow > lastRow) {
        return rowDataMap;
    }
    const { dataView, objectSize } = getWasmDataInfo();
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
type TxtFilterModel = { col_id: string; value: string };

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

    // Replace state with refs for sort and filter models.
    const sortModelRef = useRef<SortModel[]>([]);
    const filterModelRef = useRef<TxtFilterModel[]>([]);

    // Helper function to refresh data in the viewport.
    const refreshData = useCallback(() => {
        // Update WASM state (e.g., update time and associated strings)
        benchmark(update_time);

        // Execute the query in WASM with the current filter and sort settings.
        const queryResult = benchmark(
            query_indices,
            filterModelRef.current,
            sortModelRef.current,
        );
        const memoryBuffer = get_memory().buffer;
        // Create a typed array view over the query result.
        const indices = new Uint32Array(
            memoryBuffer,
            queryResult.ptr,
            queryResult.len,
        );

        // Update the total row count.
        viewportParamsRef.current?.setRowCount(indices.length);

        // If viewport range is defined, update row data.
        const params = viewportParamsRef.current;
        const range = viewportRangeRef.current;
        if (params && range.first <= range.last) {
            const { first, last } = range;
            const updatedRows: { [index: number]: DataRowUI } = benchmark(
                getRowDataMapFromIndices,
                indices,
                first,
                last,
            );
            benchmark(params.setRowData, updatedRows);
        }
    }, []);

    // Trigger an immediate refresh when filters change.
    const onFilterChanged = (event: FilterChangedEvent<DataRowUI>) => {
        const getFilterModel = event.api.getFilterModel();
        const filters: TxtFilterModel[] = Object.keys(getFilterModel)
            .filter((key) => {
                const filterInstance = getFilterModel[key] as TextFilterModel;
                return (
                    filterInstance.filterType === "text" &&
                    filterInstance.filter
                );
            })
            .map((key) => {
                const filterModel = getFilterModel[key] as TextFilterModel;
                return {
                    col_id: key,
                    value: filterModel.filter as string,
                };
            });
        filterModelRef.current = filters;
        benchmark(refreshData);
    };

    // Trigger an immediate refresh when sort changes.
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
        sortModelRef.current = sort_model;
        benchmark(refreshData);
    };

    // Set up an interval to periodically refresh the visible rows.
    useEffect(() => {
        const intervalId = setInterval(() => {
            benchmark(refreshData);
        }, intervalMs);
        return () => clearInterval(intervalId);
    }, [intervalMs, refreshData]);

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
                benchmark(refreshData);
            },
            /** Called when the datasource is destroyed (optional cleanup). */
            destroy: () => {
                viewportParamsRef.current = null;
            },
        };
    }, [refreshData]);

    return {
        viewportDatasource,
        onFilterChanged,
        onSortChanged,
    };
}
