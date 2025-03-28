// src/decoder.ts
const textDecoder = new TextDecoder("utf-8");

// Cache variables – if the pointer and length haven’t changed, we can reuse the result.
let cachedNamePtr: number | null = null;
let cachedNameLen: number = 0;
let cachedDecodedName = "";

export function decodeName(
    buffer: ArrayBuffer,
    namePtr: number,
    nameLen: number,
): string {
    // If the pointer and length are unchanged, return the cached string.
    if (cachedNamePtr === namePtr && cachedNameLen === nameLen) {
        return cachedDecodedName;
    }
    // Create a Uint8Array view on the WASM memory for the given pointer/length.
    const bytes = new Uint8Array(buffer, namePtr, nameLen);
    // Decode the bytes into a UTF-8 string.
    const decoded = textDecoder.decode(bytes).split("\0")[0]; // trim any trailing null characters
    // Update the cache.
    cachedNamePtr = namePtr;
    cachedNameLen = nameLen;
    cachedDecodedName = decoded;
    return decoded;
}
