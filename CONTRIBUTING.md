# Contributing to @sorodoc/sdk

Thank you for your interest in contributing to **SoroDoc SDK**! We welcome bug fixes, documentation improvements, specification coverage expansions, and feature contributions.

As part of the [SoroDoc Ecosystem](https://github.com/SoroDoc-Labs), `@sorodoc/sdk` serves as the foundational, authoritative engine for extracting, decoding, normalizing, and generating documentation and typed bindings from Soroban smart contract WASM binaries.

---

## Prerequisites

- **Node.js**: `>= 20.0.0` (Active LTS versions 20.x, 22.x, or 24.x recommended)
- **npm**: `>= 10.0.0`
- **Git**: `>= 2.30.0`

Verify your local environment:
```bash
node -v
npm -v
git --version
```

---

## Quickstart Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SoroDoc-Labs/sorodoc-sdk.git
   cd sorodoc-sdk
   ```

2. **Install dependencies:**
   ```bash
   npm ci
   ```

3. **Verify build and tests:**
   ```bash
   npm run build
   npm test
   ```

---

## Available Development Scripts

All scripts are configured in `package.json` and run through npm:

| Command | Description |
| :--- | :--- |
| `npm run build` | Compiles TypeScript into ESM (`dist/index.mjs`), CommonJS (`dist/index.js`), and declaration files (`dist/index.d.ts`, `dist/index.d.mts`) using `tsup`. |
| `npm run typecheck` | Runs the TypeScript compiler (`tsc --noEmit`) to verify strict static typing without emitting files. |
| `npm run lint` | Runs ESLint across `src/**/*.ts` and `tests/**/*.ts`. |
| `npm run lint:fix` | Automatically fixes autofixable ESLint formatting and linting errors. |
| `npm test` | Runs the test suite once via Vitest. |
| `npm run test:watch` | Runs Vitest in interactive watch mode for active TDD development. |
| `npm run test:coverage` | Generates a full test coverage report. |

---

## Architectural Boundaries & Responsibility

`@sorodoc/sdk` is the **single source of truth** for:
- Safe WASM binary parsing and extraction of the `contractspecv0` custom section.
- Variable-length XDR deserialization into standard Soroban `SCSpecEntry` objects.
- Normalization into the deterministic `ContractSpecAST` model.
- Markdown documentation generation.
- TypeScript client interface generation.
- OpenAPI 3.0 schema generation.
- Contract specification validation (`validateContractSpec`).
- Read-only contract code retrieval via Soroban RPC (`fetchSpecFromRpc`).

### Critical Boundary Guidelines
1. **Never implement UI or CLI logic here:** Terminal argument parsing belongs in `sorodoc-cli`. Browser components belong in `sorodoc-dashboard`.
2. **Never store keys or sign transactions:** SoroDoc is strictly an inspection and documentation toolchain. Do not introduce transaction signing, secret key handling, or wallet storage.
3. **OpenAPI Scope:** Generated OpenAPI schemas describe smart contract function endpoints and schema definitions for API exploration; they represent contract interfaces, not an existing deployed HTTP web service.

For deeper architectural details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Git Workflow & Contribution Process

1. **Find or Open an Issue:**
   Browse [open issues](https://github.com/SoroDoc-Labs/sorodoc-sdk/issues). Good starting points are labeled [`good first issue`](https://github.com/SoroDoc-Labs/sorodoc-sdk/labels/good%20first%20issue) or [`beginner`](https://github.com/SoroDoc-Labs/sorodoc-sdk/labels/beginner). Comment on the issue to announce your intent.

2. **Create a Dedicated Branch:**
   Branch off the latest `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   # or: git checkout -b fix/your-bugfix-name
   ```

3. **Branch Naming Conventions:**
   - `feat/<topic>`: New features or generator enhancements.
   - `fix/<topic>`: Bug fixes or parsing corrections.
   - `docs/<topic>`: Documentation and contributor improvements.
   - `test/<topic>`: Test fixtures and regression coverage.

4. **Commit Message Format:**
   Use Conventional Commits (atomic, descriptive commits):
   ```text
   feat(parser): add support for multi-element tuple decoding
   fix(openapi): correctly format optional parameter schemas
   docs(contributing): clarify development setup steps
   ```

5. **Pre-PR Verification Checklist:**
   Before pushing your commits, verify all quality gates pass locally:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   ```

6. **Submit a Pull Request:**
   - Push your branch to GitHub: `git push origin feat/your-feature-name`.
   - Open a PR against `main`. Fill out the PR template completely, referencing any related issue (e.g. `Resolves #13`).
   - GitHub Actions CI will automatically test your PR across Node.js 20.x, 22.x, and 24.x.

---

## Reporting Bugs & Proposing Features

- **Bug Reports:** Open an issue using the [Bug Report template](https://github.com/SoroDoc-Labs/sorodoc-sdk/issues/new?template=bug_report.yml). Provide a minimal reproducible WASM sample or spec snippet.
- **Feature Requests:** Open an issue using the [Feature Request template](https://github.com/SoroDoc-Labs/sorodoc-sdk/issues/new?template=feature_request.yml) explaining your motivation and proposed API.
- **Security Vulnerabilities:** Do **NOT** file public issues for security exploits or vulnerabilities. Please follow the instructions in [SECURITY.md](./SECURITY.md) to report security concerns privately.

---

## Code of Conduct

All contributors and maintainers are expected to follow our [Code of Conduct](./CODE_OF_CONDUCT.md) to ensure an inclusive, respectful environment.
