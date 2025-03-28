import { ColDef, FirstDataRenderedEvent, GridOptions } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useEffect, useMemo } from "react";
import { get_memory, populate_objects } from "wasm-shared-memory";
import { DataRowUI } from "../DataRowUI";
import { useWasmViewportData } from "../useWasmViewportData";

type WasmGridProps = {
    NUM_OF_ROWS: number;
};

export function WasmGrid ( { NUM_OF_ROWS }: WasmGridProps )
{
    const { viewportDatasource, onFilterChanged, onSortChanged } =
        useWasmViewportData( 1000 );

    const gridContext = useMemo(
        () => ( { wasmMemory: get_memory() as WebAssembly.Memory } ),
        [],
    );

    const gridOptions: GridOptions<DataRowUI> = useMemo(
        () => ( {
            getRowId: ( { data } ) => data.id.toString(),
            rowModelType: "viewport",
            viewportRowModelPageSize: 50,
            viewportRowModelBufferSize: 10,
            defaultColDef: {
                filter: true,
                floatingFilter: true,
            },
        } ),
        [],
    );

    const columnDefs: ColDef<DataRowUI>[] = useMemo<ColDef<DataRowUI>[]>(
        () => [
            { headerName: "ID", field: "id" },
            { headerName: "Value", field: "value" },
            {
                headerName: "Time (ms)",
                field: "time_ms",
                valueFormatter: ( { data } ) =>
                    new Date( data?.time_ms ?? 0 ).toISOString(),
            },
            {
                headerName: "Name",
                field: "name",
                cellDataType: "string",
                filter: "agTextColumnFilter",
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

    const onFirstDataRendered = ( {
        api,
    }: FirstDataRenderedEvent<DataRowUI> ) =>
    {
        api.autoSizeAllColumns();
    };

    useEffect( () =>
    {
        populate_objects( NUM_OF_ROWS );
        return () =>
        {
            // * free in rs
        };
    }, [ NUM_OF_ROWS ] );

    return (
        <div className="grid-container">
            <AgGridReact
                gridOptions={ gridOptions }
                columnDefs={ columnDefs }
                viewportDatasource={ viewportDatasource }
                onFirstDataRendered={ onFirstDataRendered }
                context={ gridContext }
                onFilterChanged={ onFilterChanged }
                onSortChanged={ onSortChanged }
            />
        </div>
    );
}
