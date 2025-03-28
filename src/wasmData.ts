// src/wasmData.ts
import { DataRowUI } from "./DataRowUI";

/**
 * Parse the shared WASM memory into an array of DataRow objects.
 * Note: The string field (name) is stored as a pointer and length.
 */
export function parseDataFromMemoryView(
    i: number,
    objectSize: number,
    dataView: DataView<ArrayBuffer>,
): DataRowUI {
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
    // Retrieve the pointer and length for the name string.
    const namePtr = dataView.getUint32(offset + 88, true);
    const nameLen = dataView.getUint32(offset + 92, true);

    // Create a Uint8Array from the buffer starting at namePtr with nameLen bytes.
    const nameBytes = new Uint8Array(dataView.buffer, namePtr, nameLen);
    // Decode the bytes into a UTF-8 string.
    const name = new TextDecoder("utf-8").decode(nameBytes);

    return { id, value, a, b, c, d, e, f, g, h, time_ms, name };
}
