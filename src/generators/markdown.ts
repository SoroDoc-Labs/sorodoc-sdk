import {
  ContractSpecAST,
  FunctionDoc,
  StructDoc,
  EnumDoc,
  UnionDoc,
  ErrorEnumDoc,
  TypeDescriptor,
} from "../ast.js";

/**
 * Converts a TypeDescriptor to a clean, human-readable string.
 */
export function formatTypeString(type: TypeDescriptor): string {
  switch (type.kind) {
    case "primitive":
      return type.name;
    case "bytesN":
      return `Bytes[${type.n}]`;
    case "option":
      return `Option<${formatTypeString(type.valueType)}>`;
    case "result":
      return `Result<${formatTypeString(type.okType)}, ${formatTypeString(type.errorType)}>`;
    case "vec":
      return `Vec<${formatTypeString(type.elementType)}>`;
    case "map":
      return `Map<${formatTypeString(type.keyType)}, ${formatTypeString(type.valueType)}>`;
    case "tuple":
      return `(${type.elementTypes.map(formatTypeString).join(", ")})`;
    case "udt":
      return type.name;
    case "unsupported":
      return `Unsupported<${type.rawKind}>`;
    default:
      return "unknown";
  }
}

/**
 * Renders contract functions as Markdown.
 */
function renderFunctions(functions: FunctionDoc[]): string {
  if (functions.length === 0) {
    return "";
  }

  const lines: string[] = ["## Functions", ""];

  for (const fn of functions) {
    lines.push(`### \`${fn.name}\``, "");
    if (fn.doc.trim()) {
      lines.push(fn.doc.trim(), "");
    }

    if (fn.inputs.length > 0) {
      lines.push("#### Parameters", "");
      lines.push("| Name | Type | Description |");
      lines.push("| :--- | :--- | :--- |");
      for (const input of fn.inputs) {
        const docText = input.doc.replace(/[\r\n]+/g, " ").trim() || "—";
        lines.push(`| \`${input.name}\` | \`${formatTypeString(input.type)}\` | ${docText} |`);
      }
      lines.push("");
    } else {
      lines.push("*No input parameters.*", "");
    }

    lines.push("#### Returns", "");
    if (fn.outputs.length === 0) {
      lines.push("`void`", "");
    } else if (fn.outputs.length === 1) {
      lines.push(`\`${formatTypeString(fn.outputs[0]!)}\``, "");
    } else {
      const formatted = fn.outputs.map((o: TypeDescriptor) => `\`${formatTypeString(o)}\``).join(", ");
      lines.push(`(${formatted})`, "");
    }
  }

  return lines.join("\n");
}

/**
 * Renders contract structs as Markdown.
 */
function renderStructs(structs: StructDoc[]): string {
  if (structs.length === 0) {
    return "";
  }

  const lines: string[] = ["## Structs", ""];

  for (const s of structs) {
    lines.push(`### \`${s.name}\``, "");
    if (s.doc.trim()) {
      lines.push(s.doc.trim(), "");
    }

    if (s.fields.length > 0) {
      lines.push("| Field | Type | Description |");
      lines.push("| :--- | :--- | :--- |");
      for (const f of s.fields) {
        const docText = f.doc.replace(/[\r\n]+/g, " ").trim() || "—";
        lines.push(`| \`${f.name}\` | \`${formatTypeString(f.type)}\` | ${docText} |`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Renders contract enums as Markdown.
 */
function renderEnums(enums: EnumDoc[]): string {
  if (enums.length === 0) {
    return "";
  }

  const lines: string[] = ["## Enums", ""];

  for (const e of enums) {
    lines.push(`### \`${e.name}\``, "");
    if (e.doc.trim()) {
      lines.push(e.doc.trim(), "");
    }

    lines.push("| Variant | Value | Description |");
    lines.push("| :--- | :--- | :--- |");
    for (const c of e.cases) {
      const docText = c.doc.replace(/[\r\n]+/g, " ").trim() || "—";
      lines.push(`| \`${c.name}\` | \`${c.value}\` | ${docText} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Renders contract error enums as Markdown.
 */
function renderErrorEnums(errorEnums: ErrorEnumDoc[]): string {
  if (errorEnums.length === 0) {
    return "";
  }

  const lines: string[] = ["## Errors", ""];

  for (const ee of errorEnums) {
    lines.push(`### \`${ee.name}\``, "");
    if (ee.doc.trim()) {
      lines.push(ee.doc.trim(), "");
    }

    lines.push("| Error Name | Code | Description |");
    lines.push("| :--- | :--- | :--- |");
    for (const c of ee.cases) {
      const docText = c.doc.replace(/[\r\n]+/g, " ").trim() || "—";
      lines.push(`| \`${c.name}\` | \`${c.value}\` | ${docText} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Renders contract unions as Markdown.
 */
function renderUnions(unions: UnionDoc[]): string {
  if (unions.length === 0) {
    return "";
  }

  const lines: string[] = ["## Unions", ""];

  for (const u of unions) {
    lines.push(`### \`${u.name}\``, "");
    if (u.doc.trim()) {
      lines.push(u.doc.trim(), "");
    }

    lines.push("| Case | Payload | Description |");
    lines.push("| :--- | :--- | :--- |");
    for (const c of u.cases) {
      const payload = c.kind === "tuple" ? `(${c.types.map(formatTypeString).join(", ")})` : "—";
      const docText = c.doc.replace(/[\r\n]+/g, " ").trim() || "—";
      lines.push(`| \`${c.name}\` | ${payload === "—" ? "—" : `\`${payload}\``} | ${docText} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export interface MarkdownOptions {
  title?: string;
  contractId?: string;
  contractName?: string;
}

/**
 * Generates deterministic Markdown documentation from a normalized AST.
 */
export function generateMarkdown(ast: ContractSpecAST, options: MarkdownOptions = {}): string {
  const sections: string[] = [];

  const title = options.title || (options.contractName ? `${options.contractName} Specification` : "Smart Contract Specification");
  sections.push(`# ${title}\n`);

  if (options.contractId) {
    sections.push(`**Contract Address:** \`${options.contractId}\`\n`);
  }

  if (ast.functions.length > 0) {
    sections.push(renderFunctions(ast.functions));
  }

  if (ast.structs.length > 0) {
    sections.push(renderStructs(ast.structs));
  }

  if (ast.enums.length > 0) {
    sections.push(renderEnums(ast.enums));
  }

  if (ast.unions.length > 0) {
    sections.push(renderUnions(ast.unions));
  }

  if (ast.errorEnums.length > 0) {
    sections.push(renderErrorEnums(ast.errorEnums));
  }

  return sections.join("\n").trim() + "\n";
}
