export function benchmark<T, Args extends any[]>(
    fn: (...args: Args) => T,
    ...args: Args
): T {
    // Derive the function name from the function's name property
    const functionName = fn.name || "anonymous function";
    // console.log(`Benchmarking: ${functionName}`);

    const startTime = performance.now();
    const result = fn(...args); // Execute the function with the provided arguments
    const endTime = performance.now();

    const elapsed = endTime - startTime;
    console.log(`Elapsed time for ${functionName}: ${elapsed.toFixed(3)} ms`);

    return result;
}
