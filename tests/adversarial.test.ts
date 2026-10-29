import { describe, it, expect } from "vitest";
import { xdr } from "@stellar/stellar-sdk";
import { extractSpecFromWasm } from "../src/extract.js";
import { generateMarkdown } from "../src/generators/markdown.js";
import { generateTypeScript, sanitizeParamName, sanitizeFieldName } from "../src/generators/typescript.js";
import { MalformedWasmError } from "../src/errors.js";

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

function buildMockWasmWithSection(sectionId: number, sectionContent: Buffer): Buffer {
  const secLen = encodeLeb128(sectionContent.length);
  return Buffer.concat([
    Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
    Buffer.from([sectionId]),
    secLen,
    sectionContent,
  ]);
}

function buildMockWasmWithSpec(specBytes: Buffer): Buffer {
  const nameBuf = Buffer.from("contractspecv0");
  const secNameLen = encodeLeb128(nameBuf.length);
  const secContent = Buffer.concat([secNameLen, nameBuf, specBytes]);
  return buildMockWasmWithSection(0, secContent);
}

describe("Adversarial WASM and Parser Robustness", () => {
  it("rejects invalid WASM magic header", () => {
    const corruptMagic = Buffer.from([0x01, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
    expect(() => extractSpecFromWasm(corruptMagic)).toThrow(MalformedWasmError);
  });

  it("rejects invalid WASM version header", () => {
    const corruptVersion = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x02, 0x00, 0x00, 0x00]);
    expect(() => extractSpecFromWasm(corruptVersion)).toThrow(MalformedWasmError);
  });

  it("rejects truncated buffer smaller than WASM header", () => {
    const tooShort = Buffer.from([0x00, 0x61, 0x73]);
    expect(() => extractSpecFromWasm(tooShort)).toThrow(MalformedWasmError);
  });

  it("rejects section payload extending beyond file boundary", () => {
    // Declares section size of 50 bytes but only provides 4 bytes
    const truncated = Buffer.concat([
      Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
      Buffer.from([0x00]),
      encodeLeb128(50),
      Buffer.from([0x01, 0x02, 0x03, 0x04]),
    ]);
    expect(() => extractSpecFromWasm(truncated)).toThrow(MalformedWasmError);
  });

  it("rejects custom section where name length exceeds section boundary", () => {
    // Custom section declares name length 20, but section payload size is only 10
    const secName = Buffer.from("contractspecv0");
    const secContent = Buffer.concat([
      encodeLeb128(50), // Lie about name length
      secName,
    ]);
    const wasm = buildMockWasmWithSection(0, secContent);
    expect(() => extractSpecFromWasm(wasm)).toThrow(MalformedWasmError);
  });

  it("ignores non-contractspec custom sections safely", () => {
    // Custom section named 'producers' or 'name' followed by a valid contractspecv0
    const unrelatedName = Buffer.from("producers");
    const unrelatedContent = Buffer.concat([
      encodeLeb128(unrelatedName.length),
      unrelatedName,
      Buffer.from("some arbitrary debug info"),
    ]);
    const unrelatedSecLen = encodeLeb128(unrelatedContent.length);

    const fn = new xdr.ScSpecFunctionV0({
      doc: "Valid func",
      name: "valid_fn",
      inputs: [],
      outputs: [],
    });
    const entry = xdr.ScSpecEntry.scSpecEntryFunctionV0(fn);
    const specName = Buffer.from("contractspecv0");
    const specContent = Buffer.concat([
      encodeLeb128(specName.length),
      specName,
      Buffer.from(entry.toXDR()),
    ]);
    const specSecLen = encodeLeb128(specContent.length);

    const wasm = Buffer.concat([
      Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
      Buffer.from([0x00]), // Custom section 1 (unrelated)
      unrelatedSecLen,
      unrelatedContent,
      Buffer.from([0x00]), // Custom section 2 (contractspecv0)
      specSecLen,
      specContent,
    ]);

    const ast = extractSpecFromWasm(wasm);
    expect(ast.functions).toHaveLength(1);
    expect(ast.functions[0]!.name).toBe("valid_fn");
  });

  it("rejects corrupted XDR inside contractspecv0 section", () => {
    const corruptXdr = Buffer.from([0xff, 0xff, 0xff, 0xff, 0x01, 0x02]);
    const wasm = buildMockWasmWithSpec(corruptXdr);
    expect(() => extractSpecFromWasm(wasm)).toThrow(MalformedWasmError);
  });

  it("sanitizes reserved TypeScript keywords for function parameters and struct fields", () => {
    expect(sanitizeParamName("function")).toBe("_function");
    expect(sanitizeParamName("import")).toBe("_import");
    expect(sanitizeParamName("validParam")).toBe("validParam");
    expect(sanitizeParamName("hyphen-param")).toBe("_hyphen-param");

    expect(sanitizeFieldName("normalField")).toBe("normalField");
    expect(sanitizeFieldName("bad-field-name")).toBe('"bad-field-name"');
  });

  it("handles complex user-defined types (enums, error enums, unions)", () => {
    const enumEntry = xdr.ScSpecEntry.scSpecEntryUdtEnumV0(
      new xdr.ScSpecUdtEnumV0({
        doc: "Status enum",
        lib: "",
        name: "Status",
        cases: [
          new xdr.ScSpecUdtEnumCaseV0({ doc: "Active", name: "Active", value: 1 }),
          new xdr.ScSpecUdtEnumCaseV0({ doc: "Paused", name: "Paused", value: 2 }),
        ],
      })
    );

    const errorEntry = xdr.ScSpecEntry.scSpecEntryUdtErrorEnumV0(
      new xdr.ScSpecUdtErrorEnumV0({
        doc: "Contract error codes",
        lib: "",
        name: "ContractError",
        cases: [
          new xdr.ScSpecUdtErrorEnumCaseV0({ doc: "Unauthorized", name: "Unauthorized", value: 100 }),
          new xdr.ScSpecUdtErrorEnumCaseV0({ doc: "NotFound", name: "NotFound", value: 101 }),
        ],
      })
    );

    const wasm = buildMockWasmWithSpec(
      Buffer.concat([Buffer.from(enumEntry.toXDR()), Buffer.from(errorEntry.toXDR())])
    );

    const ast = extractSpecFromWasm(wasm);
    expect(ast.enums).toHaveLength(1);
    expect(ast.enums[0]!.name).toBe("Status");
    expect(ast.enums[0]!.cases).toHaveLength(2);

    expect(ast.errorEnums).toHaveLength(1);
    expect(ast.errorEnums[0]!.name).toBe("ContractError");
    expect(ast.errorEnums[0]!.cases[0]!.value).toBe(100);

    const md = generateMarkdown(ast);
    expect(md).toContain("## Enums");
    expect(md).toContain("`Status`");
    expect(md).toContain("## Errors");
    expect(md).toContain("`ContractError`");

    const ts = generateTypeScript(ast);
    expect(ts).toContain("export enum Status {");
    expect(ts).toContain("export enum ContractError {");
    expect(ts).toContain("Unauthorized = 100,");
  });
});
