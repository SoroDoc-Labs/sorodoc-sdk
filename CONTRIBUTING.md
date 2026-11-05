# Contributing to sorodoc-sdk

Thank you for your interest in contributing to SoroDoc!

## Development Setup

1. **Prerequisites:** Node.js >= 20.0.0, npm >= 10.0.0, Git.
2. **Clone:**
   `ash
   git clone https://github.com/SoroDoc-Labs/sorodoc-sdk.git
   cd sorodoc-sdk
   `
3. **Install Dependencies:**
   `ash
   npm install
   `
4. **Verification Commands:**
   `ash
   npm run typecheck
   npm test
   npm run build
   `

## Development Workflow

- **Branch Naming:**
  - eat/<short-description> for new capabilities.
  - ix/<short-description> for bug fixes.
  - docs/<short-description> for documentation.
- **Commit Messages:** Follow Conventional Commits (eat:, ix:, docs:, 	est:, ci:, chore:).
- **Issue-First:** For non-trivial features or architectural changes, please open an Issue to discuss before opening a Pull Request.

## Pull Request Guidelines

1. Ensure all CI checks pass (Build, Typecheck & Test across Node 20, 22, 24).
2. Write unit and regression tests for any new functionality or fixed defects.
3. Keep PRs focused and atomic.
4. Ensure all PR conversations are resolved prior to merge.
