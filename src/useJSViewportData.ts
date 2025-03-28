import {
    FilterChangedEvent,
    IViewportDatasource,
    IViewportDatasourceParams,
    SortChangedEvent,
    SortDirection,
    TextFilterModel,
} from "ag-grid-community";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { DataRowUI, JSObject } from "./DataRowUI";
import { benchmark } from "./benchmark";

type SortModel = { col_id: string; sort: string };
type TxtFilterModel = { col_id: string; value: string };

// Global storage for JS objects
let jsObjects: JSObject[] = [];

export function populateJSObjects(num: number) {
    jsObjects = Array.from({ length: num }, (_, i) => new JSObject(i));
}

export function updateJSTime() {
    const now = Date.now();
    jsObjects.forEach((obj) => obj.updateTime(now));
}

export function getJSObjects() {
    return jsObjects;
}

export type JSViewportData = {
    viewportDatasource: IViewportDatasource;
    onFilterChanged: (event: FilterChangedEvent<DataRowUI>) => void;
    onSortChanged: ({ columns }: SortChangedEvent<DataRowUI>) => void;
};

export function useJSViewportData(intervalMs = 1000): JSViewportData {
    const viewportParamsRef = useRef<IViewportDatasourceParams | null>(null);
    const viewportRangeRef = useRef<{ first: number; last: number }>({
        first: 0,
        last: -1,
    });
    const sortModelRef = useRef<SortModel[]>([]);
    const filterModelRef = useRef<TxtFilterModel[]>([]);

    const refreshJSData = useCallback(function refreshJSData() {
        benchmark(updateJSTime);

        // Apply filters
        let filteredIndices = jsObjects.map((_, index) => index);
        if (filterModelRef.current.length > 0) {
            filteredIndices = filteredIndices.filter((index) => {
                const obj = jsObjects[index];
                return filterModelRef.current.every((filter) => {
                    const filterVal = filter.value.toLowerCase();
                    switch (filter.col_id) {
                        case "id":
                            return obj.id
                                .toString()
                                .toLowerCase()
                                .includes(filterVal);
                        case "value":
                            return obj.value
                                .toString()
                                .toLowerCase()
                                .includes(filterVal);
                        case "name":
                            return obj.name.toLowerCase().includes(filterVal);
                        default:
                            return true;
                    }
                });
            });
        }

        // Apply sorting
        if (sortModelRef.current.length > 0) {
            filteredIndices.sort((a, b) => {
                const objA = jsObjects[a];
                const objB = jsObjects[b];
                for (const sort of sortModelRef.current) {
                    let comparison = 0;
                    switch (sort.col_id) {
                        case "id":
                            comparison = objA.id - objB.id;
                            break;
                        case "value":
                            comparison = objA.value - objB.value;
                            break;
                        case "name":
                            comparison = objA.name.localeCompare(objB.name);
                            break;
                        default:
                            comparison = 0;
                    }
                    if (comparison !== 0) {
                        return sort.sort === "asc" ? comparison : -comparison;
                    }
                }
                return 0;
            });
        }

        viewportParamsRef.current?.setRowCount(filteredIndices.length);
        const params = viewportParamsRef.current;
        const range = viewportRangeRef.current;
        if (params && range.first <= range.last) {
            const { first, last } = range;
            const updatedRows: { [index: number]: DataRowUI } = {};
            for (let i = first; i <= last && i < filteredIndices.length; i++) {
                const masterIndex = filteredIndices[i];
                const obj = jsObjects[masterIndex];
                updatedRows[i] = new DataRowUI(
                    masterIndex,
                    new DataView(new ArrayBuffer(0)), // Dummy DataView since we're using JS objects
                    0, // Dummy objectSize since we're using JS objects
                    obj, // Pass the JS object directly
                );
            }
            params.setRowData(updatedRows);
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
        benchmark(refreshJSData);
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
        benchmark(refreshJSData);
    };

    useEffect(() => {
        const intervalId = setInterval(() => {
            benchmark(refreshJSData);
        }, intervalMs);
        return () => clearInterval(intervalId);
    }, [intervalMs, refreshJSData]);

    const viewportDatasource = useMemo<IViewportDatasource>(() => {
        return {
            init: (params: IViewportDatasourceParams) => {
                viewportParamsRef.current = params;
                params.setRowCount(jsObjects.length);
            },
            setViewportRange: (firstRow: number, lastRow: number) => {
                if (!viewportParamsRef.current) return;
                viewportRangeRef.current = { first: firstRow, last: lastRow };
                benchmark(refreshJSData);
            },
            destroy: () => {
                viewportParamsRef.current = null;
            },
        };
    }, [refreshJSData]);

    return {
        viewportDatasource,
        onFilterChanged,
        onSortChanged,
    };
}
