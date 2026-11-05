# Architecture — @sorodoc/sdk

`@sorodoc/sdk` is the foundational TypeScript library powering the **SoroDoc** ecosystem. It provides the single source of truth for parsing Soroban smart contract specifications, constructing a normalized Abstract Syntax Tree (AST), and generating deterministic documentation and typed interfaces.

---

## 1. System Context & Organization Boundaries

```
                    ┌─────────────────────────┐
                    │  Compiled Soroban WASM  │
                    │   or Soroban RPC Node   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │     @sorodoc/sdk      │
                     │ (Single Source of     │
                     │  Truth Engine)        │
                     └─────┬───────────┬─────┘
                           │           │
         ┌─────────────────┘           └─────────────────┐
         ▼                                               ▼
┌──────────────────┐                           ┌────────────────────┐
│   sorodoc-cli    │                           │ sorodoc-dashboard  │
│ (Terminal CLI)   │                           │ (Web Explorer)     │
└──────────────────┘                           └────────────────────┘
```

### Core Tenets
1. **Single Source of Truth:** Neither `sorodoc-cli` nor `sorodoc-dashboard` performs contract specification parsing or code generation. Both consume `@sorodoc/sdk` directly.
2. **Deterministic Extraction:** Identical contract inputs produce semantically identical ASTs and documentation across all environments.
3. **Strictly Read-Only:** SoroDoc inspects contract schemas and generated interfaces; it does not sign transactions, hold private keys, or manage wallet state.

---

## 2. Internal Module Architecture

The SDK source code is organized cleanly in `src/`:

```
src/
├── ast.ts                    # Normalized ContractSpecAST and TypeDef definitions
├── errors.ts                 # Strongly-typed error hierarchy (SoroDocError, etc.)
├── wasm.ts                   # WASM binary section inspection & spec buffer extraction
├── parser.ts                 # Variable-length XDR deserializer & AST normalizer
├── extract.ts                # Top-level extraction facade (extractSpecFromWasm)
├── validator.ts              # Contract specification validator & diagnostics
├── rpc.ts                    # Soroban RPC client integration (fetchSpecFromRpc)
├── index.ts                  # Public library exports
└── generators/
    ├── markdown.ts           # Clean Markdown documentation generator
    ├── typescript.ts         # Strongly-typed TypeScript client interface generator
    └── openapi.ts            # OpenAPI 3.0 schema mapping generator
```

### Module Responsibilities

| Module | Purpose |
| :--- | :--- |
| **`ast.ts`** | Defines the language-agnostic AST representing Soroban functions, parameters, return types, structs, enums, unions, and error definitions. |
| **`wasm.ts`** | Parses WebAssembly binary headers and sections using native Node/ArrayBuffer utilities without external runtime WASM engines, targeting the custom section named `contractspecv0`. |
| **`parser.ts`** | Decodes raw XDR byte sequences into `@stellar/stellar-sdk` `xdr.ScSpecEntry` objects and normalizes them into clean TypeScript AST nodes. |
| **`extract.ts`** | Combines WASM section scanning and XDR AST normalization into a single entry-point function (`extractSpecFromWasm`). |
| **`rpc.ts`** | Queries a live Soroban RPC node via `@stellar/stellar-sdk` to read contract instance persistent ledger entries, resolve the contract executable WASM hash, retrieve contract bytecode, and extract its specification. |
| **`validator.ts`** | Evaluates a `ContractSpecAST` for completeness, identifying missing docstrings, duplicate function names, and structural inconsistencies. |
| **`generators/markdown.ts`** | Generates GitHub-flavored Markdown contract documentation with function summaries, signature tables, and type schemas. |
| **`generators/typescript.ts`** | Generates idiomatic TypeScript interfaces and client method definitions compatible with modern bundlers. |
| **`generators/openapi.ts`** | Translates contract functions into OpenAPI 3.0 paths and operations for API explorers (e.g. Swagger UI, Postman). |

---

## 3. Data Flow

```
Compiled WASM Binary
        │
        ▼ (src/wasm.ts)
Raw 'contractspecv0' Buffer
        │
        ▼ (src/parser.ts: parseSpecEntriesFromBuffers)
xdr.ScSpecEntry[] List
        │
        ▼ (src/parser.ts: normalizeSpecEntries)
Normalized ContractSpecAST
        ├──► src/validator.ts            ──► ValidationResult (Stats & Diagnostics)
        ├──► src/generators/markdown.ts   ──► Markdown Documentation (.md)
        ├──► src/generators/typescript.ts ──► TypeScript Interfaces (.ts)
        └──► src/generators/openapi.ts    ──► OpenAPI 3.0 Schema (.json)
```

---

## 4. Contract Specification Boundaries & OpenAPI Model

### What Contract Specifications Contain
Soroban contract specifications embedded in WASM contain:
- Exported contract function names and parameter identifiers.
- Parameter and return types (primitives, structs, tuples, enums, unions, optionals, results).
- Doc comments written in the Rust source (`/// ...`).
- Error codes and enum variant definitions.

### What Specifications Do NOT Contain
Contract specifications do **not** describe:
- Deployed network addresses or environment-specific configuration.
- Runtime gas costs or ledger footprint bounds.
- Authentication policies enforced dynamically within function bodies.

### Understanding Generated OpenAPI
The OpenAPI generator translates contract functions into HTTP-like paths (e.g., `/functions/{functionName}`) with JSON Schema request bodies and response definitions. This provides a familiar schema model for developer portals and API tooling, **not a claim that a smart contract is a deployed HTTP web server**.

---

## 5. External Dependencies

- **`@stellar/stellar-sdk`**: The sole runtime dependency, utilized strictly for Soroban XDR definitions (`xdr.ScSpecEntry`, `xdr.LedgerKey`, `xdr.ScVal`) and the Soroban RPC client (`rpc.Server`).
- **`tsup`**: Dual ESM/CommonJS build pipeline and TypeScript `.d.ts` generator.
- **`vitest`**: Test runner for unit, adversarial, compilation, and regression tests.
