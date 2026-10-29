import { MalformedWasmError, MissingSpecError } from "./errors.js";

const WASM_MAGIC = Buffer.from([0x00, 0x61, 0x73, 0x6d]); // \0asm
const WASM_VERSION = Buffer.from([0x01, 0x00, 0x00, 0x00]);

const MAX_WASM_SIZE = 100 * 1024 * 1024; // 100 MB safe limit
const TARGET_SECTION_NAME = "contractspecv0";

/**
 * Reads an unsigned LEB128 integer from a buffer at a given offset.
 */
function readVarUint(buffer: Buffer, offset: number): { value: number; bytesRead: number } {
  let result = 0;
  let shift = 0;
  let bytesRead = 0;

  while (true) {
    if (offset + bytesRead >= buffer.length) {
      throw new MalformedWasmError("Unexpected end of file while reading LEB128 integer.");
    }
    const byte = buffer[offset + bytesRead]!;
    bytesRead++;
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      break;
    }
    shift += 7;
    if (shift >= 35) {
      throw new MalformedWasmError("LEB128 integer overflow.");
    }
  }

  return { value: result, bytesRead };
}

/**
 * Extracts raw contract specification byte buffers from a Soroban WASM binary.
 *
 * Looks for custom sections (id = 0) with the name "contractspecv0".
 */
export function extractSpecBytesFromWasm(wasmBuffer: Buffer): Buffer[] {
  if (wasmBuffer.length < 8) {
    throw new MalformedWasmError("WASM binary is smaller than the 8-byte header.");
  }

  if (wasmBuffer.length > MAX_WASM_SIZE) {
    throw new MalformedWasmError(`WASM binary exceeds max allowed limit of ${MAX_WASM_SIZE} bytes.`);
  }

  if (!wasmBuffer.subarray(0, 4).equals(WASM_MAGIC)) {
    throw new MalformedWasmError("Invalid WASM magic bytes.");
  }

  if (!wasmBuffer.subarray(4, 8).equals(WASM_VERSION)) {
    throw new MalformedWasmError("Unsupported WASM binary version.");
  }

  const specBuffers: Buffer[] = [];
  let offset = 8;

  while (offset < wasmBuffer.length) {
    if (offset + 1 > wasmBuffer.length) {
      throw new MalformedWasmError("Truncated section header.");
    }

    const sectionId = wasmBuffer[offset]!;
    offset += 1;

    const { value: sectionSize, bytesRead: sizeBytesRead } = readVarUint(wasmBuffer, offset);
    offset += sizeBytesRead;

    if (offset + sectionSize > wasmBuffer.length) {
      throw new MalformedWasmError("Section payload extends beyond end of WASM buffer.");
    }

    const sectionEnd = offset + sectionSize;

    // Custom section (ID 0)
    if (sectionId === 0) {
      const sectionOffset = offset;
      const { value: nameLength, bytesRead: nameBytesRead } = readVarUint(wasmBuffer, sectionOffset);
      const nameStart = sectionOffset + nameBytesRead;
      const nameEnd = nameStart + nameLength;

      if (nameEnd <= sectionEnd) {
        const sectionName = wasmBuffer.subarray(nameStart, nameEnd).toString("utf8");
        if (sectionName === TARGET_SECTION_NAME) {
          const payload = wasmBuffer.subarray(nameEnd, sectionEnd);
          specBuffers.push(Buffer.from(payload));
        }
      }
    }

    offset = sectionEnd;
  }

  if (specBuffers.length === 0) {
    throw new MissingSpecError();
  }

  return specBuffers;
}
