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

type RowDataMap = {
    [index: number]: DataRowUI;
};

type WasmDataInfo = {
    dataView: DataView;
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
    const wasmMemory = get_memory().buffer;
    const dataView = new DataView(wasmMemory, ptr, len * objectSize);
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
    if (queryIndices.length === 0 || firstRow > lastRow) {
        return rowDataMap;
    }
    const { dataView, objectSize } = getWasmDataInfo();
    for (let i = firstRow; i <= lastRow && i < queryIndices.length; i++) {
        const masterIndex = queryIndices[i];
        rowDataMap[i] = new DataRowUI(masterIndex, dataView, objectSize);
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
    const viewportParamsRef = useRef<IViewportDatasourceParams | null>(null);
    const viewportRangeRef = useRef<{ first: number; last: number }>({
        first: 0,
        last: -1,
    });
    const sortModelRef = useRef<SortModel[]>([]);
    const filterModelRef = useRef<TxtFilterModel[]>([]);

    const refreshData = useCallback(function refreshData() {
        benchmark(update_time);
        const queryResult = benchmark(
            query_indices,
            filterModelRef.current,
            sortModelRef.current,
        );
        const memoryBuffer = get_memory().buffer;
        const indices = new Uint32Array(
            memoryBuffer,
            queryResult.ptr,
            queryResult.len,
        );
        viewportParamsRef.current?.setRowCount(indices.length);
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

    useEffect(() => {
        const intervalId = setInterval(() => {
            benchmark(refreshData);
        }, intervalMs);
        return () => clearInterval(intervalId);
    }, [intervalMs, refreshData]);

    const viewportDatasource = useMemo<IViewportDatasource>(() => {
        return {
            init: (params: IViewportDatasourceParams) => {
                viewportParamsRef.current = params;
                const { len } = getWasmDataInfo();
                params.setRowCount(len);
            },
            setViewportRange: (firstRow: number, lastRow: number) => {
                if (!viewportParamsRef.current) return;
                viewportRangeRef.current = { first: firstRow, last: lastRow };
                benchmark(refreshData);
            },
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
