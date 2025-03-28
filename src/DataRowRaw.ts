export interface DataRowRaw {
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
