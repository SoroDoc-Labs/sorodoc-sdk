import { describe, it, expect } from "vitest";
import { xdr } from "@stellar/stellar-sdk";
import { extractSpecFromWasm } from "../src/extract.js";
import { generateMarkdown } from "../src/generators/markdown.js";
import { generateTypeScript } from "../src/generators/typescript.js";
import { generateOpenApi } from "../src/generators/openapi.js";
import { MalformedWasmError, MissingSpecError } from "../src/errors.js";

function encodeLeb128(n: number): Buffer {
  const bytes: number[] = [];
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (n !== 0);
  return Buffer.from(bytes);
}

function buildMockWasmWithSpec(specBytes: Buffer): Buffer {
  const nameBuf = Buffer.from("contractspecv0");
  const secNameLen = encodeLeb128(nameBuf.length);
  const secContent = Buffer.concat([secNameLen, nameBuf, specBytes]);
  const secLen = encodeLeb128(secContent.length);

  return Buffer.concat([
    Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x00]),
    secLen,
    secContent,
  ]);
}

describe("WASM Contract Spec Extraction & Parsing", () => {
  it("extracts and parses function specifications and generates Markdown", () => {
    const fn1 = new xdr.ScSpecFunctionV0({
      doc: "Increments the counter and returns updated value.",
      name: "increment",
      inputs: [
        new xdr.ScSpecFunctionInputV0({
          doc: "Step amount",
          name: "step",
          type: xdr.ScSpecTypeDef.scSpecTypeU32(),
        }),
      ],
      outputs: [xdr.ScSpecTypeDef.scSpecTypeU32()],
    });

    const fn2 = new xdr.ScSpecFunctionV0({
      doc: "Initializes the contract admin.",
      name: "initialize",
      inputs: [
        new xdr.ScSpecFunctionInputV0({
          doc: "Admin address",
          name: "admin",
          type: xdr.ScSpecTypeDef.scSpecTypeAddress(),
        }),
      ],
      outputs: [],
    });

    const struct1 = new xdr.ScSpecUdtStructV0({
      doc: "Configuration data structure",
      lib: "",
      name: "Config",
      fields: [
        new xdr.ScSpecUdtStructFieldV0({
          doc: "Admin public key",
          name: "admin",
          type: xdr.ScSpecTypeDef.scSpecTypeAddress(),
        }),
        new xdr.ScSpecUdtStructFieldV0({
          doc: "Execution count",
          name: "count",
          type: xdr.ScSpecTypeDef.scSpecTypeU32(),
        }),
      ],
    });

    const entry1 = xdr.ScSpecEntry.scSpecEntryFunctionV0(fn1);
    const entry2 = xdr.ScSpecEntry.scSpecEntryFunctionV0(fn2);
    const entry3 = xdr.ScSpecEntry.scSpecEntryUdtStructV0(struct1);

    const specBytes = Buffer.concat([entry1.toXDR(), entry2.toXDR(), entry3.toXDR()]);
    const wasm = buildMockWasmWithSpec(specBytes);

    const ast = extractSpecFromWasm(wasm);

    expect(ast.functions).toHaveLength(2);
    expect(ast.structs).toHaveLength(1);

    // Sorted alphabetically
    expect(ast.functions[0]!.name).toBe("increment");
    expect(ast.functions[1]!.name).toBe("initialize");

    // Test Markdown Generation
    const md = generateMarkdown(ast, {
      contractName: "CounterContract",
      contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
    });

    expect(md).toContain("# CounterContract Specification");
    expect(md).toContain("`CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM`");
    expect(md).toContain("### `increment`");
    expect(md).toContain("Increments the counter and returns updated value.");
    expect(md).toContain("| `step` | `u32` | Step amount |");
    expect(md).toContain("`u32`");
    expect(md).toContain("### `Config`");
    expect(md).toContain("| `admin` | `address` | Admin public key |");

    // Test TypeScript Generation
    const ts = generateTypeScript(ast, "CounterClient");
    expect(ts).toContain("export interface CounterClient {");
    expect(ts).toContain("increment(step: number): Promise<number>;");
    expect(ts).toContain("initialize(admin: string): Promise<void>;");
    expect(ts).toContain("export interface Config {");

    // Test OpenAPI Generation
    const openapi = generateOpenApi(ast, { title: "Counter API" });
    expect(openapi["openapi"]).toBe("3.0.3");
    expect((openapi["paths"] as any)["/functions/increment"]).toBeDefined();
    expect((openapi["paths"] as any)["/functions/initialize"]).toBeDefined();
    expect((openapi["components"] as any).schemas["Config"]).toBeDefined();
  });

  it("throws MalformedWasmError for corrupted WASM header", () => {
    const corruptWasm = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
    expect(() => extractSpecFromWasm(corruptWasm)).toThrow(MalformedWasmError);
  });

  it("throws MissingSpecError when WASM has no contractspecv0 section", () => {
    const plainWasm = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    expect(() => extractSpecFromWasm(plainWasm)).toThrow(MissingSpecError);
  });

  it("produces deterministic Markdown across multiple invocations", () => {
    const fn = new xdr.ScSpecFunctionV0({
      doc: "Deterministic test function",
      name: "test_fn",
      inputs: [],
      outputs: [],
    });
    const entry = xdr.ScSpecEntry.scSpecEntryFunctionV0(fn);
    const wasm = buildMockWasmWithSpec(Buffer.from(entry.toXDR()));

    const ast1 = extractSpecFromWasm(wasm);
    const ast2 = extractSpecFromWasm(wasm);

    const md1 = generateMarkdown(ast1);
    const md2 = generateMarkdown(ast2);

    expect(md1).toBe(md2);
  });
});
