import { ColDef, FirstDataRenderedEvent, GridOptions } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useEffect, useMemo } from "react";
import { DataRowUI } from "../DataRowUI";
import { populateJSObjects, useJSViewportData } from "../useJSViewportData";

type JsGridProps = {
    NUM_OF_ROWS: number;
};

export function JSGrid ( { NUM_OF_ROWS }: JsGridProps )
{
    const { viewportDatasource, onFilterChanged, onSortChanged } =
        useJSViewportData( 1000 );

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
        populateJSObjects( NUM_OF_ROWS );
    }, [ NUM_OF_ROWS ] );

    return (
        <div className="grid-container">
            <AgGridReact
                gridOptions={ gridOptions }
                columnDefs={ columnDefs }
                viewportDatasource={ viewportDatasource }
                onFirstDataRendered={ onFirstDataRendered }
                onFilterChanged={ onFilterChanged }
                onSortChanged={ onSortChanged }
            />
        </div>
    );
}
