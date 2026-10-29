import { describe, it, expect } from "vitest";
import { validateContractSpec } from "../src/validator.js";
import { ContractSpecAST } from "../src/ast.js";

describe("Contract Specification Validator", () => {
  it("detects missing docstrings and reports informational issues", () => {
    const mockAst: ContractSpecAST = {
      functions: [
        {
          name: "undocumentedFn",
          doc: "",
          inputs: [{ name: "amount", doc: "", type: { kind: "primitive", name: "u64" } }],
          outputs: [],
        },
      ],
      structs: [],
      enums: [],
      unions: [],
      errorEnums: [],
      events: [],
    };

    const result = validateContractSpec(mockAst);
    expect(result.valid).toBe(true);
    expect(result.stats.documentedFunctions).toBe(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.severity).toBe("info");
    expect(result.issues[0]?.message).toContain("missing docstring");
  });

  it("detects duplicate parameter errors", () => {
    const mockAst: ContractSpecAST = {
      functions: [
        {
          name: "transfer",
          doc: "Transfers funds",
          inputs: [
            { name: "account", doc: "from", type: { kind: "primitive", name: "address" } },
            { name: "account", doc: "to", type: { kind: "primitive", name: "address" } },
          ],
          outputs: [],
        },
      ],
      structs: [],
      enums: [],
      unions: [],
      errorEnums: [],
      events: [],
    };

    const result = validateContractSpec(mockAst);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.severity === "error" && i.message.includes("Duplicate parameter"))).toBe(true);
  });
});
