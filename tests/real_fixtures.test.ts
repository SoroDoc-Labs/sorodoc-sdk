import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { extractSpecFromWasm } from "../src/extract.js";
import { generateMarkdown } from "../src/generators/markdown.js";
import { generateTypeScript } from "../src/generators/typescript.js";
import { generateOpenApi } from "../src/generators/openapi.js";
import { validateContractSpec } from "../src/validator.js";

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");

describe("Real-World Soroban WASM Fixture Compatibility", () => {
  it("parses and generates outputs for real increment.wasm", () => {
    const wasmPath = path.join(FIXTURES_DIR, "increment.wasm");
    const wasmBuffer = fs.readFileSync(wasmPath);

    const ast = extractSpecFromWasm(wasmBuffer);
    expect(ast.functions).toHaveLength(1);
    expect(ast.functions[0]!.name).toBe("increment");
    expect(ast.functions[0]!.doc).toContain("Increment increments an internal counter");
    expect(ast.functions[0]!.outputs[0]!.kind).toBe("primitive");
    expect((ast.functions[0]!.outputs[0] as any).name).toBe("u32");

    // Markdown
    const md = generateMarkdown(ast, { contractName: "IncrementContract" });
    expect(md).toContain("# IncrementContract Specification");
    expect(md).toContain("### `increment`");
    expect(md).toContain("`u32`");

    // TypeScript
    const ts = generateTypeScript(ast, "IncrementClient");
    expect(ts).toContain("export interface IncrementClient {");
    expect(ts).toContain("increment(): Promise<number>;");

    // OpenAPI
    const openapi = generateOpenApi(ast, { title: "Increment API" });
    expect(openapi["openapi"]).toBe("3.0.3");
    expect((openapi["paths"] as any)["/functions/increment"]).toBeDefined();

    // Validation
    const validation = validateContractSpec(ast);
    expect(validation.valid).toBe(true);
    expect(validation.stats.functionCount).toBe(1);
    expect(validation.stats.documentedFunctions).toBe(1);
  });

  it("parses and generates outputs for real custom_types.wasm", () => {
    const wasmPath = path.join(FIXTURES_DIR, "custom_types.wasm");
    const wasmBuffer = fs.readFileSync(wasmPath);

    const ast = extractSpecFromWasm(wasmBuffer);
    expect(ast.functions).toHaveLength(2);
    expect(ast.structs).toHaveLength(1);

    // Verify State struct
    const stateStruct = ast.structs[0]!;
    expect(stateStruct.name).toBe("State");
    expect(stateStruct.fields).toHaveLength(2);
    expect(stateStruct.fields[0]!.name).toBe("count");
    expect(stateStruct.fields[1]!.name).toBe("last_incr");

    // Functions
    const getFn = ast.functions.find((f) => f.name === "get_state");
    expect(getFn).toBeDefined();
    expect(getFn!.outputs[0]!.kind).toBe("udt");
    expect((getFn!.outputs[0] as any).name).toBe("State");

    // TypeScript
    const ts = generateTypeScript(ast, "CustomTypesClient");
    expect(ts).toContain("export interface State {");
    expect(ts).toContain("count: number;");
    expect(ts).toContain("last_incr: number;");
    expect(ts).toContain("get_state(): Promise<State>;");

    // OpenAPI
    const openapi = generateOpenApi(ast);
    expect((openapi["components"] as any).schemas["State"]).toBeDefined();
  });

  it("parses and generates outputs for real errors.wasm", () => {
    const wasmPath = path.join(FIXTURES_DIR, "errors.wasm");
    const wasmBuffer = fs.readFileSync(wasmPath);

    const ast = extractSpecFromWasm(wasmBuffer);
    expect(ast.functions).toHaveLength(1);
    expect(ast.errorEnums).toHaveLength(1);

    const errEnum = ast.errorEnums[0]!;
    expect(errEnum.name).toBe("Error");
    expect(errEnum.cases).toHaveLength(1);
    expect(errEnum.cases[0]!.name).toBe("LimitReached");
    expect(errEnum.cases[0]!.value).toBe(1);

    // Output Result<u32, Error>
    const fn = ast.functions[0]!;
    expect(fn.outputs[0]!.kind).toBe("result");

    // TypeScript
    const ts = generateTypeScript(ast, "ErrorsClient");
    expect(ts).toContain("export enum Error {");
    expect(ts).toContain("LimitReached = 1,");
  });
});
