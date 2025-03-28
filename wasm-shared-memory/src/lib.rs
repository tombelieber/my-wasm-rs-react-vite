use js_sys::Date;
use serde::Deserialize;
use serde_wasm_bindgen;
use wasm_bindgen::prelude::*;

// --- Data Structure ---
// Instead of an inline fixed buffer, we store a pointer and length for the string.
// We allocate a Box<[u8]> for each name.
#[repr(C)]
#[derive(Debug)]
pub struct MyObject {
    pub id: u32,           // 4 bytes
    pub value: f64,        // 8 bytes
    pub a: f64,            // 8 bytes
    pub b: f64,            // 8 bytes
    pub c: f64,            // 8 bytes
    pub d: f64,            // 8 bytes
    pub e: f64,            // 8 bytes
    pub f: f64,            // 8 bytes
    pub g: f64,            // 8 bytes
    pub h: f64,            // 8 bytes
    pub time_ms: f64,      // 8 bytes
    pub name_ptr: *mut u8, // pointer to a heap-allocated byte slice
    pub name_len: u32,     // length of the string in bytes
}

// Global storage for our objects.
static mut OBJECTS: Option<Vec<MyObject>> = None;

#[wasm_bindgen]
pub fn populate_objects(num: usize) {
    unsafe {
        OBJECTS = Some(
            (0..num)
                .map(|i| {
                    // Allocate an initial string (as bytes) on the heap.
                    let init_str = "Initial name".to_string();
                    let boxed: Box<[u8]> = init_str.into_bytes().into_boxed_slice();
                    let name_ptr = boxed.as_ptr() as *mut u8;
                    let name_len = boxed.len() as u32;
                    // Leak the boxed slice so that the pointer remains valid.
                    std::mem::forget(boxed);
                    MyObject {
                        id: i as u32,
                        value: 42.0,
                        a: 1.1,
                        b: 2.2,
                        c: 3.3,
                        d: 4.4,
                        e: 5.5,
                        f: 6.6,
                        g: 7.7,
                        h: 8.8,
                        time_ms: 0.0,
                        name_ptr,
                        name_len,
                    }
                })
                .collect(),
        );
    }
}

/// Update each object's time and its name in place.
/// For each object, free the old string allocation and replace it with a new one.
#[wasm_bindgen]
pub fn update_time() {
    let now = Date::now();
    unsafe {
        if let Some(ref mut vec) = OBJECTS {
            for (i, obj) in vec.iter_mut().enumerate() {
                obj.time_ms = now;
                let new_str = format!("Row {} at time {}", i, now);
                // Allocate new bytes from the new string.
                let new_box: Box<[u8]> = new_str.into_bytes().into_boxed_slice();
                let new_ptr = new_box.as_ptr() as *mut u8;
                let new_len = new_box.len() as u32;
                // Free the previous allocation if any.
                if !obj.name_ptr.is_null() && obj.name_len > 0 {
                    // Recreate the boxed slice from the raw parts to drop it.
                    let _ = Box::from_raw(std::slice::from_raw_parts_mut(
                        obj.name_ptr,
                        obj.name_len as usize,
                    ));
                }
                // Leak the new allocation so its pointer stays valid.
                std::mem::forget(new_box);
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

/// Returns the WASM memory so JS can create a DataView over it.
#[wasm_bindgen]
pub fn get_memory() -> wasm_bindgen::JsValue {
    wasm_bindgen::memory()
}

/// Returns the size (in bytes) of MyObject.
///
/// On a wasm32 target with this layout, the struct should have:
/// - id: 4 bytes + 4 bytes padding,
/// - 9 × f64 = 72 bytes (from value to h) starting at offset 8,
/// - time_ms: 8 bytes (offset 80),
/// - name_ptr: 4 bytes (offset 88),
/// - name_len: 4 bytes (offset 92),
/// total = 96 bytes.
#[wasm_bindgen]
pub fn get_object_size() -> usize {
    std::mem::size_of::<MyObject>()
}

// --- Query and Caching (unchanged in essence) ---

#[wasm_bindgen]
pub struct QueryResult {
    pub ptr: *mut u32,
    pub len: usize,
}

#[derive(Deserialize, Debug, serde::Serialize)]
struct SortInstruction {
    col_id: String,
    sort: String, // expected "asc" or "desc"
}

#[derive(Deserialize, Debug, serde::Serialize)]
struct FilterInstruction {
    col_id: String,
    value: String, // string
}

#[derive(Clone)]
struct QueryCache {
    filter_json: String,
    sort_json: String,
    indices: Box<[u32]>,
}

static mut LAST_QUERY_CACHE: Option<QueryCache> = None;

#[wasm_bindgen]
pub fn query_indices(filter: &JsValue, sort: &JsValue) -> QueryResult {
    let filter_model: Vec<FilterInstruction> =
        serde_wasm_bindgen::from_value(filter.clone()).unwrap_or_else(|_| Vec::new());
    let sort_model: Vec<SortInstruction> =
        serde_wasm_bindgen::from_value(sort.clone()).unwrap_or_else(|_| Vec::new());
    let new_filter_json = serde_json::to_string(&filter_model).unwrap_or_default();
    let new_sort_json = serde_json::to_string(&sort_model).unwrap_or_default();
    unsafe {
        if let Some(ref cache) = LAST_QUERY_CACHE {
            if cache.filter_json == new_filter_json && cache.sort_json == new_sort_json {
                return QueryResult {
                    ptr: cache.indices.as_ptr() as *mut u32,
                    len: cache.indices.len(),
                };
            }
        }
    }
    let objects = unsafe { OBJECTS.as_ref().expect("Objects not populated") };
    let mut indices: Vec<u32> = (0..(objects.len() as u32)).collect();
    indices.retain(|&i| {
        let obj = &objects[i as usize];
        for filter_inst in &filter_model {
            let filter_val = filter_inst.value.to_lowercase();
            let passes = match filter_inst.col_id.as_str() {
                "id" => obj.id.to_string().to_lowercase().contains(&filter_val),
                "value" => obj.value.to_string().to_lowercase().contains(&filter_val),
                "name" => {
                    let slice =
                        unsafe { std::slice::from_raw_parts(obj.name_ptr, obj.name_len as usize) };
                    let name_str = std::str::from_utf8(slice).unwrap_or("");
                    name_str.to_lowercase().contains(&filter_val)
                }
                _ => true,
            };
            if !passes {
                return false;
            }
        }
        true
    });
    indices.sort_by(|&a_idx, &b_idx| {
        let a = &objects[a_idx as usize];
        let b = &objects[b_idx as usize];
        for sort_inst in &sort_model {
            let ordering = match sort_inst.col_id.as_str() {
                "id" => a.id.cmp(&b.id),
                "value" => a
                    .value
                    .partial_cmp(&b.value)
                    .unwrap_or(std::cmp::Ordering::Equal),
                "name" => {
                    let a_slice =
                        unsafe { std::slice::from_raw_parts(a.name_ptr, a.name_len as usize) };
                    let b_slice =
                        unsafe { std::slice::from_raw_parts(b.name_ptr, b.name_len as usize) };
                    let a_str = std::str::from_utf8(a_slice).unwrap_or("");
                    let b_str = std::str::from_utf8(b_slice).unwrap_or("");
                    a_str.cmp(b_str)
                }
                _ => std::cmp::Ordering::Equal,
            };
            if ordering != std::cmp::Ordering::Equal {
                return if sort_inst.sort == "asc" {
                    ordering
                } else {
                    ordering.reverse()
                };
            }
        }
        std::cmp::Ordering::Equal
    });
    let boxed_slice = indices.into_boxed_slice();
    let new_cache = QueryCache {
        filter_json: new_filter_json,
        sort_json: new_sort_json,
        indices: boxed_slice,
    };
    unsafe {
        LAST_QUERY_CACHE = Some(new_cache);
        if let Some(ref cache) = LAST_QUERY_CACHE {
            return QueryResult {
                ptr: cache.indices.as_ptr() as *mut u32,
                len: cache.indices.len(),
            };
        }
    }
    unreachable!();
}
