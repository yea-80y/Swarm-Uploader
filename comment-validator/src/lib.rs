use wasm_bindgen::prelude::*;
use serde::Deserialize;

#[wasm_bindgen]
extern {
    // For logging from WASM to the browser console (optional)
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Deserialize)]
pub struct Comment {
    pub author: String,
    pub content: String,
    pub timestamp: u64,
}

#[wasm_bindgen]
pub fn validate_comment(json: &str) -> bool {
    match serde_json::from_str::<Comment>(json) {
        Ok(c) => {
            // Optional validation logic
            if c.author.is_empty() || c.content.is_empty() {
                log("Validation failed: Empty author or content");
                return false;
            }
            true
        }
        Err(e) => {
            log(&format!("Invalid JSON: {e}"));
            false
        }
    }
}
