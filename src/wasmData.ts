// src/wasmData.ts
import {
    get_memory,
    get_objects_ptr,
    get_objects_len,
    get_object_size,
    update_time,
} from "wasm-shared-memory";

export interface DataRow {
    id: number;
    value: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    g: number;
    h: number;
    time_ms: number;
    // Instead of storing a string, we store the raw pointer and length.
    namePtr: number;
    nameLen: number;
}

/**
 * Parse the shared WASM memory into an array of DataRow objects.
 * Note: The string field (name) is stored as a pointer and length.
 */
export function parseWasmData(): DataRow[] | null {
    const start = performance.now();
    const ptr = get_objects_ptr();
    const len = get_objects_len();
    const objectSize = get_object_size(); // now should be 96 bytes
    if (ptr === 0 || len === 0) {
        console.warn("No data available from WASM module.");
        return null;
    }
    const wasmMemory = get_memory() as WebAssembly.Memory;
    const dataView = new DataView(wasmMemory.buffer, ptr, len * objectSize);
    const rows: DataRow[] = [];
    for (let i = 0; i < len; i++) {
        const offset = i * objectSize;
        const id = dataView.getUint32(offset, true);
        const value = dataView.getFloat64(offset + 8, true);
        const a = dataView.getFloat64(offset + 16, true);
        const b = dataView.getFloat64(offset + 24, true);
        const c = dataView.getFloat64(offset + 32, true);
        const d = dataView.getFloat64(offset + 40, true);
        const e = dataView.getFloat64(offset + 48, true);
        const f = dataView.getFloat64(offset + 56, true);
        const g = dataView.getFloat64(offset + 64, true);
        const h = dataView.getFloat64(offset + 72, true);
        const time_ms = dataView.getFloat64(offset + 80, true);
        // The new fields: namePtr at offset 88, nameLen at offset 92.
        const namePtr = dataView.getUint32(offset + 88, true);
        const nameLen = dataView.getUint32(offset + 92, true);
        rows.push({
            id,
            value,
            a,
            b,
            c,
            d,
            e,
            f,
            g,
            h,
            time_ms,
            namePtr,
            nameLen,
        });
    }
    const end = performance.now();
    console.log(`Parsed ${len} objects in ${end - start} ms`);
    return rows;
}

/**
 * Update the time_ms field in WASM memory, then re-parse the data.
 */
export function updateWasmData(): DataRow[] | null {
    const start = performance.now();
    update_time();
    const end = performance.now();
    console.log(`Updated time_ms in ${end - start} ms`);
    return parseWasmData();
}
