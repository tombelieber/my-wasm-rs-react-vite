/**
 * --- Zero-Copy Proxy for Row Data ---
 * Instead of copying the data out of WASM memory, we define a lightweight
 * proxy with getters that read directly from the DataView.
 */

// Native JS implementation of the data structure
export class JSObject {
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
    name: string;

    constructor(id: number) {
        this.id = id;
        this.value = 42.0;
        this.a = 1.1;
        this.b = 2.2;
        this.c = 3.3;
        this.d = 4.4;
        this.e = 5.5;
        this.f = 6.6;
        this.g = 7.7;
        this.h = 8.8;
        this.time_ms = 0;
        this.name = "Initial name";
    }

    updateTime(now: number) {
        this.time_ms = now;
        this.name = `Row ${this.id} at time ${now}`;
    }
}

export class DataRowUI {
    private masterIndex: number;
    private dataView: DataView;
    private objectSize: number;
    private jsObject?: JSObject;

    constructor(masterIndex: number, dataView: DataView, objectSize: number, jsObject?: JSObject) {
        this.masterIndex = masterIndex;
        this.dataView = dataView;
        this.objectSize = objectSize;
        this.jsObject = jsObject;
    }

    private readWasmValue(offset: number): number {
        return this.dataView.getFloat64(this.masterIndex * this.objectSize + offset, true);
    }

    private readWasmString(): string {
        const ptr = this.dataView.getUint32(this.masterIndex * this.objectSize + 88, true);
        const len = this.dataView.getUint32(this.masterIndex * this.objectSize + 92, true);
        const memory = this.dataView.buffer;
        const stringData = new Uint8Array(memory, ptr, len);
        return new TextDecoder().decode(stringData);
    }

    get id(): number {
        if (this.jsObject) return this.jsObject.id;
        return this.dataView.getUint32(this.masterIndex * this.objectSize, true);
    }

    get value(): number {
        if (this.jsObject) return this.jsObject.value;
        return this.readWasmValue(8);
    }

    get a(): number {
        if (this.jsObject) return this.jsObject.a;
        return this.readWasmValue(16);
    }

    get b(): number {
        if (this.jsObject) return this.jsObject.b;
        return this.readWasmValue(24);
    }

    get c(): number {
        if (this.jsObject) return this.jsObject.c;
        return this.readWasmValue(32);
    }

    get d(): number {
        if (this.jsObject) return this.jsObject.d;
        return this.readWasmValue(40);
    }

    get e(): number {
        if (this.jsObject) return this.jsObject.e;
        return this.readWasmValue(48);
    }

    get f(): number {
        if (this.jsObject) return this.jsObject.f;
        return this.readWasmValue(56);
    }

    get g(): number {
        if (this.jsObject) return this.jsObject.g;
        return this.readWasmValue(64);
    }

    get h(): number {
        if (this.jsObject) return this.jsObject.h;
        return this.readWasmValue(72);
    }

    get time_ms(): number {
        if (this.jsObject) return this.jsObject.time_ms;
        return this.readWasmValue(80);
    }

    get name(): string {
        if (this.jsObject) return this.jsObject.name;
        return this.readWasmString();
    }
}
