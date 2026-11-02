# Changelog

All notable changes to `@sorodoc/sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-02

### Added
- Core WebAssembly parser to extract the `contractspecv0` custom section from Soroban bytecode.
- Parser and normalizer for concatenated `SCSpecEntry` XDR records.
- Support for functions, inputs, return types, structs, enums, unions, and error enums.
- Markdown documentation generator with GitHub Flavored Markdown tables and navigation.
- TypeScript interface and client generator with accurate Soroban type mappings and keyword escaping.
- OpenAPI 3.0.3 schema generator with deterministic schemas and contract-to-HTTP mapping.
- Contract specification validator detecting missing docstrings, duplicate symbols, and structural inconsistencies.
- Soroban RPC integration (`fetchSpecFromRpc`) to retrieve contract instances and WASM bytecode directly from ledger entries.
- Real Soroban WASM test fixtures compiled from official `stellar/soroban-examples` (`increment.wasm`, `custom_types.wasm`, `errors.wasm`).
- Comprehensive test suite including adversarial WASM, in-memory TypeScript AST compilation, and mock RPC integration.
