use js_sys::Date;
use wasm_bindgen::prelude::*;

// Define a struct with 11 fields.
// With #[repr(C)], we get a predictable layout.
// On wasm32, the u32 field (4 bytes) is followed by 4 bytes of padding,
// then 10 f64 fields (10 * 8 = 80 bytes). Total = 4 + 4 + 80 = 88 bytes.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct MyObject {
    pub id: u32,      // 4 bytes
    pub value: f64,   // 8 bytes
    pub a: f64,       // 8 bytes
    pub b: f64,       // 8 bytes
    pub c: f64,       // 8 bytes
    pub d: f64,       // 8 bytes
    pub e: f64,       // 8 bytes
    pub f: f64,       // 8 bytes
    pub g: f64,       // 8 bytes
    pub h: f64,       // 8 bytes
    pub time_ms: f64, // 8 bytes (to be updated)
}

// Global storage for our objects.
static mut OBJECTS: Option<Vec<MyObject>> = None;

#[wasm_bindgen]
pub fn populate_objects(num: usize) {
    unsafe {
        // Define a "template" for the constant f64 fields.
        let template = (
            42.0, // value
            1.1,  // a
            2.2,  // b
            3.3,  // c
            4.4,  // d
            5.5,  // e
            6.6,  // f
            7.7,  // g
            8.8,  // h
        );
        // Populate with num objects with id equal to the index.
        // time_ms is initially set to 0.
        OBJECTS = Some(
            (0..num)
                .map(|i| MyObject {
                    id: i as u32,
                    value: template.0,
                    a: template.1,
                    b: template.2,
                    c: template.3,
                    d: template.4,
                    e: template.5,
                    f: template.6,
                    g: template.7,
                    h: template.8,
                    time_ms: 0.0,
                })
                .collect(),
        );
    }
}

/// Update each object's time_ms field to the current time in milliseconds.
#[wasm_bindgen]
pub fn update_time() {
    let now = Date::now(); // returns f64 milliseconds
    unsafe {
        if let Some(ref mut vec) = OBJECTS {
            for obj in vec.iter_mut() {
                obj.time_ms = now;
            }
        }
    }
}

#[wasm_bindgen]
pub fn get_objects_ptr() -> *const MyObject {
    unsafe {
        OBJECTS
            .as_ref()
            .map(|vec| vec.as_ptr())
            .unwrap_or(std::ptr::null())
    }
}

#[wasm_bindgen]
pub fn get_objects_len() -> usize {
    unsafe { OBJECTS.as_ref().map(|vec| vec.len()).unwrap_or(0) }
}

#[wasm_bindgen]
pub fn get_memory() -> wasm_bindgen::JsValue {
    wasm_bindgen::memory()
}

/// Export the size (in bytes) of MyObject.
/// With the layout described above, the size is 88 bytes.
#[wasm_bindgen]
pub fn get_object_size() -> usize {
    std::mem::size_of::<MyObject>()
}
