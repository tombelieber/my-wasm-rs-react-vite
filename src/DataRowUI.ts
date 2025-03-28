/**
 * --- Zero-Copy Proxy for Row Data ---
 * Instead of copying the data out of WASM memory, we define a lightweight
 * proxy with getters that read directly from the DataView.
 */

export class DataRowUI {
    // Reuse a single TextDecoder instance.
    static decoder: TextDecoder;
    constructor(
        private masterIndex: number,
        private dataView: DataView,
        private objectSize: number,
    ) {}

    get id(): number {
        return this.dataView.getUint32(
            this.masterIndex * this.objectSize,
            true,
        );
    }
    get value(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 8,
            true,
        );
    }
    get a(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 16,
            true,
        );
    }
    get b(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 24,
            true,
        );
    }
    get c(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 32,
            true,
        );
    }
    get d(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 40,
            true,
        );
    }
    get e(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 48,
            true,
        );
    }
    get f(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 56,
            true,
        );
    }
    get g(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 64,
            true,
        );
    }
    get h(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 72,
            true,
        );
    }
    get time_ms(): number {
        return this.dataView.getFloat64(
            this.masterIndex * this.objectSize + 80,
            true,
        );
    }
    get name(): string {
        const baseOffset = this.masterIndex * this.objectSize;
        // On wasm32, name_ptr is at offset 88 and name_len at offset 92.
        const namePtr = this.dataView.getUint32(baseOffset + 88, true);
        const nameLen = this.dataView.getUint32(baseOffset + 92, true);
        const memoryBuffer = this.dataView.buffer;
        const bytes = new Uint8Array(memoryBuffer, namePtr, nameLen);
        if (!DataRowUI.decoder) {
            DataRowUI.decoder = new TextDecoder("utf-8");
        }
        return DataRowUI.decoder.decode(bytes);
    }
}
