# Real-World Soroban Contract Test Fixtures

This directory contains authentic compiled `.wasm` binaries generated from official [stellar/soroban-examples](https://github.com/stellar/soroban-examples) (Apache-2.0 License) using the official Stellar CLI compiler (`stellar contract build`, target: `wasm32v1-none`).

## Fixture Metadata & Provenance

### 1. `increment.wasm` (607 bytes)
- **Source:** [`soroban-examples/increment`](https://github.com/stellar/soroban-examples/tree/main/increment)
- **License:** Apache-2.0
- **Contract Name:** `soroban-increment-contract`
- **Compiler:** `stellar 28.0.0`, `rustc 1.98.1`, `soroban-sdk 28.0.0`
- **Specification Characteristics:**
  - Exported function: `increment() -> u32`
  - Function docstrings extracted from Rust comments (`/// Increment increments an internal counter, and returns the value.`)
  - No user-defined types.

### 2. `custom_types.wasm` (1179 bytes)
- **Source:** [`soroban-examples/custom_types`](https://github.com/stellar/soroban-examples/tree/main/custom_types)
- **License:** Apache-2.0
- **Contract Name:** `soroban-custom-types-contract`
- **Compiler:** `stellar 28.0.0`, `rustc 1.98.1`, `soroban-sdk 28.0.0`
- **Specification Characteristics:**
  - Struct: `State` with fields `count: u32`, `last_incr: u32`
  - Functions:
    - `get_state() -> Option<State>` (User-defined struct output with option wrapping)
    - `increment(incr: u32) -> u32`

### 3. `errors.wasm` (769 bytes)
- **Source:** [`soroban-examples/errors`](https://github.com/stellar/soroban-examples/tree/main/errors)
- **License:** Apache-2.0
- **Contract Name:** `soroban-errors-contract`
- **Compiler:** `stellar 28.0.0`, `rustc 1.98.1`, `soroban-sdk 28.0.0`
- **Specification Characteristics:**
  - `#[contracterror]` Error Enum: `Error` with cases `LimitReached = 1`
  - Function: `increment() -> Result<u32, Error>`
