import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import { xdr } from "@stellar/stellar-sdk";
import { generateTypeScript } from "../src/generators/typescript.js";
import { generateOpenApi } from "../src/generators/openapi.js";
import { ContractSpecAST } from "../src/ast.js";

function compileTypeScriptSource(source: string): { errors: string[] } {
  const options: ts.CompilerOptions = {
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
  };

  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile;
  host.getSourceFile = (fileName, languageVersion) => {
    if (fileName === "generated.ts") {
      return ts.createSourceFile(fileName, source, languageVersion);
    }
    return originalGetSourceFile(fileName, languageVersion);
  };

  const program = ts.createProgram(["generated.ts"], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const errors = diagnostics
    .filter((d) => d.file?.fileName === "generated.ts")
    .map((d) => {
      const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
      return message;
    });

  return { errors };
}

describe("Generated TypeScript & OpenAPI Deep Compilation Verification", () => {
  it("compiles generated TypeScript into valid AST with no type errors", () => {
    const ast: ContractSpecAST = {
      functions: [
        {
          name: "execute_transfer",
          doc: "Transfers funds securely",
          inputs: [
            { name: "from", doc: "Sender address", type: { kind: "primitive", name: "address" } },
            { name: "to", doc: "Receiver address", type: { kind: "primitive", name: "address" } },
            { name: "amount", doc: "Amount in stroops", type: { kind: "primitive", name: "i128" } },
            { name: "memo", doc: "Optional memo", type: { kind: "option", valueType: { kind: "primitive", name: "string" } } },
          ],
          outputs: [{ kind: "primitive", name: "bool" }],
        },
        {
          name: "get_status",
          doc: "Returns status enum",
          inputs: [],
          outputs: [{ kind: "udt", name: "State" }],
        },
      ],
      structs: [
        {
          name: "Receipt",
          doc: "Transaction receipt struct",
          lib: "",
          fields: [
            { name: "id", doc: "Unique receipt ID", type: { kind: "bytesN", n: 32 } },
            { name: "timestamp", doc: "Ledger timestamp", type: { kind: "primitive", name: "u64" } },
          ],
        },
      ],
      enums: [
        {
          name: "State",
          doc: "System states",
          lib: "",
          cases: [
            { name: "Pending", doc: "Pending processing", value: 0 },
            { name: "Confirmed", doc: "Confirmed on chain", value: 1 },
          ],
        },
      ],
      unions: [
        {
          name: "Action",
          doc: "Action union variants",
          lib: "",
          cases: [
            { kind: "void", name: "Reset", doc: "Reset action" },
            { kind: "tuple", name: "Deposit", doc: "Deposit action", types: [{ kind: "primitive", name: "u64" }] },
          ],
        },
      ],
      errorEnums: [
        {
          name: "Errors",
          doc: "Contract error variants",
          lib: "",
          cases: [{ name: "InsufficientBalance", doc: "Not enough balance", value: 1 }],
        },
      ],
      events: [],
    };

    const tsCode = generateTypeScript(ast, "PaymentClient");
    expect(tsCode).toContain("export interface PaymentClient");
    expect(tsCode).toContain("execute_transfer(from: string, to: string, amount: bigint, memo: string | undefined): Promise<boolean>;");

    const { errors } = compileTypeScriptSource(tsCode);
    expect(errors).toEqual([]);
  });

  it("produces compliant OpenAPI 3.0.3 schema specification matching standard schema structure", () => {
    const ast: ContractSpecAST = {
      functions: [
        {
          name: "deposit",
          doc: "Deposit tokens",
          inputs: [
            { name: "amount", doc: "Stroops amount", type: { kind: "primitive", name: "u128" } },
          ],
          outputs: [{ kind: "primitive", name: "void" }],
        },
      ],
      structs: [],
      enums: [],
      unions: [],
      errorEnums: [],
      events: [],
    };

    const schema = generateOpenApi(ast, { title: "Deposit Contract", version: "2.1.0" });
    expect(schema["openapi"]).toBe("3.0.3");
    expect(schema["info"]).toBeDefined();
    expect((schema["info"] as any).title).toBe("Deposit Contract");
    expect((schema["info"] as any).version).toBe("2.1.0");
    expect((schema["paths"] as any)["/functions/deposit"]).toBeDefined();
    expect((schema["paths"] as any)["/functions/deposit"].post.operationId).toBe("deposit");

    // Structural JSON round-trip validation
    const jsonStr = JSON.stringify(schema);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.openapi).toBe("3.0.3");
  });
});
