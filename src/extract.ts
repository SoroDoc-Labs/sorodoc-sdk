import { extractSpecBytesFromWasm } from "./wasm.js";
import { parseSpecEntriesFromBuffers, normalizeSpecEntries } from "./parser.js";
import { ContractSpecAST } from "./ast.js";

/**
 * Extracts and decodes the Soroban contract specification from a local WASM binary buffer into an AST.
 */
export function extractSpecFromWasm(wasmBuffer: Buffer): ContractSpecAST {
  const specBuffers = extractSpecBytesFromWasm(wasmBuffer);
  const entries = parseSpecEntriesFromBuffers(specBuffers);
  return normalizeSpecEntries(entries);
}
