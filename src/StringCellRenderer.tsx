// src/NameCellRenderer.tsx
import React, { useMemo } from "react";
import { ICellRendererParams } from "ag-grid-community";

// It is assumed that you have access to the WASM memory buffer.
// One approach is to pass it via the grid context (see below).
interface StringCellRendererParams extends ICellRendererParams {
    context: { wasmMemory: WebAssembly.Memory };
}

const StringCellRenderer: React.FC<StringCellRendererParams> = (props) => {
    const { data, context } = props;
    // Lazy decode the UTF-8 string from WASM memory using the pointer and length.
    const decodedName = useMemo(() => {
        if (!data || data.namePtr == null || data.nameLen == null) return "";
        const { wasmMemory } = context;
        // Create a Uint8Array view on the memory for the string.
        const bytes = new Uint8Array(
            wasmMemory.buffer,
            data.namePtr,
            data.nameLen,
        );
        return new TextDecoder("utf-8").decode(bytes).split("\0")[0]; // stop at null if present
    }, [data, context]);

    return <span>{decodedName}</span>;
};

export default StringCellRenderer;
