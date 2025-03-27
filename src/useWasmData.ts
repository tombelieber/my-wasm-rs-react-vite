// src/useWasmData.ts
import { useEffect, useState, useRef } from "react";
import { DataRow, updateWasmData } from "./wasmData";

/**
 * A custom hook that polls WASM memory every intervalMs milliseconds
 * and returns the latest array of DataRow.
 */
export function useWasmData(intervalMs = 1000): DataRow[] {
    const [data, setData] = useState<DataRow[]>([]);
    const lastUpdateRef = useRef<number>(0);
    const pendingUpdateRef = useRef<DataRow[] | null>(null);

    useEffect(() => {
        let animationFrameId: number;
        const intervalId = setInterval(() => {
            const now = performance.now();
            if (now - lastUpdateRef.current >= intervalMs) {
                const newData = updateWasmData();
                if (newData) {
                    pendingUpdateRef.current = newData;
                    lastUpdateRef.current = now;
                }
            }
        }, intervalMs);

        const animate = () => {
            if (pendingUpdateRef.current) {
                setData(pendingUpdateRef.current);
                pendingUpdateRef.current = null;
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        // Start the animation frame loop
        animationFrameId = requestAnimationFrame(animate);

        // Do an initial update
        const now = performance.now();
        if (now - lastUpdateRef.current >= intervalMs) {
            const newData = updateWasmData();
            if (newData) {
                pendingUpdateRef.current = newData;
                lastUpdateRef.current = now;
            }
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            clearInterval(intervalId);
        };
    }, [intervalMs]);

    return data;
}
