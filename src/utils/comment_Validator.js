// src/utils/commentValidator.js

import initWasmValidator from "../../public/wasm-validator/pkg/wasm_validator.js";

// This function loads the WASM module and runs the validate_comment function
export async function validateComment(jsonString) {
  try {
    const wasm = await initWasmValidator(); // Load wasm module
    return wasm.validate_comment(jsonString); // Call the exposed function
  } catch (error) {
    console.error("WASM validation failed:", error);
    return false;
  }
}
