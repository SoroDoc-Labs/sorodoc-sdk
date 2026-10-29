# @sorodoc/sdk

The foundational TypeScript SDK for the **SoroDoc** ecosystem. Extracts, normalizes, and generates documentation and typed interfaces from Stellar Soroban smart contract specifications.

## Features

- **WASM Spec Extraction:** Safely inspects local compiled WASM files and parses the embedded `contractspecv0` custom section.
- **Variable-length XDR Deserialization:** Robustly decodes sequences of `SCSpecEntry` records without assuming fixed sizes.
- **AST Normalization:** Produces a clean, deterministic, typed Abstract Syntax Tree for contract functions, structs, enums, unions, and error definitions.
- **Deterministic Documentation:** Generates clean Markdown specifications.
- **Typed Code Generation:** Generates TypeScript definition interfaces and OpenAPI 3.0 schema mappings.
- **Soroban RPC Spec Retrieval:** Resolves contract instance ledger entries and WASM binaries directly via Soroban RPC endpoints.
- **Strict Error Handling:** Typed errors for malformed WASM headers, missing custom sections, and unsupported executable types.

## Installation

```bash
npm install @sorodoc/sdk
```

## Quick Start

```typescript
import * as fs from "fs";
import { extractSpecFromWasm, generateMarkdown, generateTypeScript, generateOpenApi } from "@sorodoc/sdk";

// 1. Read Soroban contract WASM binary
const wasmBuffer = fs.readFileSync("./contract.wasm");

// 2. Extract and normalize specification AST
const ast = extractSpecFromWasm(wasmBuffer);

// 3. Generate Markdown documentation
const markdown = generateMarkdown(ast, { contractName: "TokenContract" });
console.log(markdown);

// 4. Generate TypeScript client interfaces
const tsClient = generateTypeScript(ast, "TokenClient");

// 5. Generate OpenAPI 3.0 specification
const openapiSpec = generateOpenApi(ast, { title: "Token Contract Interface" });
```

## Testing & Quality

```bash
# Run unit tests
npm test

# Run strict type checking
npm run typecheck

# Run linter
npm run lint

# Build ESM, CJS and TypeScript declarations
npm run build
```

## License

MIT
