use js_sys::Date;
use serde::Deserialize;
use serde_json::Value;
use serde_wasm_bindgen;
use std::cmp::Ordering;
use wasm_bindgen::prelude::*;
use web_sys::console;

// Now our struct has 13 fields: the original 11 plus a pointer and length for a dynamic string.
// On wasm32, the layout is as follows:
//   id: u32          → 4 bytes
//   padding:         → 4 bytes (to align following f64 fields)
//   10 f64 fields   → 10 * 8 = 80 bytes
//   => so far 88 bytes,
// plus:
//   name_ptr: *const u8 → 4 bytes (on wasm32)
//   name_len: u32       → 4 bytes
// Total = 88 + 8 = 96 bytes.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct MyObject {
    pub id: u32,             // 4 bytes
    pub value: f64,          // 8 bytes
    pub a: f64,              // 8 bytes
    pub b: f64,              // 8 bytes
    pub c: f64,              // 8 bytes
    pub d: f64,              // 8 bytes
    pub e: f64,              // 8 bytes
    pub f: f64,              // 8 bytes
    pub g: f64,              // 8 bytes
    pub h: f64,              // 8 bytes
    pub time_ms: f64,        // 8 bytes (to be updated)
    pub name_ptr: *const u8, // 8 bytes
    pub name_len: u32,       // 4 bytes
}

// Global storage for our objects.
static mut OBJECTS: Option<Vec<MyObject>> = None;

#[derive(Deserialize, Debug)]
struct SortInstruction {
    col_id: String,
    sort: String, // expected "asc" or "desc"
}

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
        // Prepare the base string that we want to store.
        let base_str = "This is a sample sentence that might be longer than usual.";
        let base_bytes = base_str.as_bytes();
        // Allocate a boxed slice and leak it so the pointer remains valid.
        let boxed = base_bytes.to_vec().into_boxed_slice();
        let name_ptr = Box::into_raw(boxed) as *const u8;
        let name_len = base_bytes.len() as u32;

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
                    name_ptr,
                    name_len,
                })
                .collect(),
        );
    }
}

/// Update each object's time_ms field to the current time in milliseconds and update the string
/// so that it includes the current time.
#[wasm_bindgen]
pub fn update_time() {
    let now = Date::now(); // current time in ms
                           // Create the new string once.
    let new_str = format!(
        "This is a sample sentence that might be longer than usual. Current time: {}",
        now
    );
    let new_bytes = new_str.as_bytes();
    let new_len = new_bytes.len() as u32;
    // Allocate the new string once.
    let boxed = new_bytes.to_vec().into_boxed_slice();
    let new_ptr = Box::into_raw(boxed) as *const u8;

    unsafe {
        if let Some(ref mut vec) = OBJECTS {
            for obj in vec.iter_mut() {
                obj.time_ms = now;
                // Update each object with the same pointer and length.
                obj.name_ptr = new_ptr;
                obj.name_len = new_len;
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
/// With the new layout, the size is 96 bytes.
#[wasm_bindgen]
pub fn get_object_size() -> usize {
    std::mem::size_of::<MyObject>()
}

#[wasm_bindgen]
pub struct QueryResult {
    ptr: *mut u32,
    len: usize,
}

#[wasm_bindgen]
impl QueryResult {
    #[wasm_bindgen(getter)]
    pub fn ptr(&self) -> *mut u32 {
        self.ptr
    }
    #[wasm_bindgen(getter)]
    pub fn len(&self) -> usize {
        self.len
    }
    /// Free the memory allocated for this query result.
    #[wasm_bindgen]
    pub fn free(self) {
        unsafe {
            // Reconstruct the vector so its memory gets freed.
            let _vec = Vec::from_raw_parts(self.ptr, self.len, self.len);
        }
    }
}

// * it should cache the grid state, so that it returned the last query without re-computing
#[wasm_bindgen]
pub fn query_indices(filter: &JsValue, sort: &JsValue) -> QueryResult {
    // Convert filter and sort instructions from JS.
    let filter_model: std::collections::HashMap<String, Value> =
        serde_wasm_bindgen::from_value(filter.clone())
            .unwrap_or_else(|_| std::collections::HashMap::new());
    let sort_model: Vec<SortInstruction> =
        serde_wasm_bindgen::from_value(sort.clone()).unwrap_or_else(|_| Vec::new());

    console::log_1(&JsValue::from_str(&format!(
        "Filter model: {:?}",
        filter_model
    )));
    console::log_1(&JsValue::from_str(&format!("Sort model: {:?}", sort_model)));

    // Get the master objects array.
    let objects = unsafe { OBJECTS.as_ref().expect("Objects not populated") };

    // Create an index vector representing each object.
    let mut indices: Vec<u32> = (0..(objects.len() as u32)).collect();
    console::log_1(&JsValue::from_str(&format!(
        "Indices before filtering: {:?}",
        indices
    )));

    // --- Filtering ---
    indices.retain(|&i| {
        let obj = &objects[i as usize];
        // For each filter condition, check if the object passes.
        for (field, criterion) in &filter_model {
            let passes = match field.as_str() {
                "id" => {
                    if let Some(filter_val) = criterion.get("filter").and_then(|v| v.as_u64()) {
                        obj.id as u64 == filter_val
                    } else {
                        true
                    }
                }
                "value" => {
                    if let Some(filter_val) = criterion.get("filter").and_then(|v| v.as_f64()) {
                        obj.value == filter_val
                    } else {
                        true
                    }
                }
                "name" => {
                    if let Some(filter_str) = criterion.get("filter").and_then(|v| v.as_str()) {
                        let slice = unsafe {
                            std::slice::from_raw_parts(obj.name_ptr, obj.name_len as usize)
                        };
                        let name_str = std::str::from_utf8(slice).unwrap_or("");
                        name_str.to_lowercase().contains(&filter_str.to_lowercase())
                    } else {
                        true
                    }
                }
                _ => true,
            };
            if !passes {
                return false;
            }
        }
        true
    });
    console::log_1(&JsValue::from_str(&format!(
        "Indices after filtering: {:?}",
        indices
    )));

    // --- Sorting ---
    indices.sort_by(|&a_idx, &b_idx| {
        let a = &objects[a_idx as usize];
        let b = &objects[b_idx as usize];
        for sort_inst in &sort_model {
            let ordering = match sort_inst.col_id.as_str() {
                "id" => a.id.cmp(&b.id),
                "value" => a.value.partial_cmp(&b.value).unwrap_or(Ordering::Equal),
                "name" => {
                    let a_str = unsafe {
                        std::str::from_utf8(std::slice::from_raw_parts(
                            a.name_ptr,
                            a.name_len as usize,
                        ))
                        .unwrap_or("")
                    };
                    let b_str = unsafe {
                        std::str::from_utf8(std::slice::from_raw_parts(
                            b.name_ptr,
                            b.name_len as usize,
                        ))
                        .unwrap_or("")
                    };
                    a_str.cmp(b_str)
                }
                _ => Ordering::Equal,
            };
            if ordering != Ordering::Equal {
                return if sort_inst.sort == "asc" {
                    ordering
                } else {
                    ordering.reverse()
                };
            }
        }
        Ordering::Equal
    });
    console::log_1(&JsValue::from_str(&format!(
        "Indices after sorting: {:?}",
        indices
    )));

    // Convert the vector into a boxed slice and expose it.
    let len = indices.len();
    let boxed_slice = indices.into_boxed_slice();
    let ptr = Box::into_raw(boxed_slice) as *mut u32;

    console::log_1(&JsValue::from_str("Query indices finished."));
    QueryResult { ptr, len }
}
