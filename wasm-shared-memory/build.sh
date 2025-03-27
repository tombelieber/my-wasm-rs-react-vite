#!/bin/bash
RUSTFLAGS="-C target-feature=+atomics,+bulk-memory,+simd128 -C link-arg=--shared-memory -C link-arg=--max-memory=65536" \
cargo build --lib --release --target wasm32-unknown-unknown -Z build-std=panic_abort,std \
&& wasm-bindgen --target web --out-dir pkg target/wasm32-unknown-unknown/release/wasm_shared_memory.wasm 