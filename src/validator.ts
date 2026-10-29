import { ContractSpecAST } from "./ast.js";

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  entityName: string;
  entityType: "function" | "struct" | "enum" | "union" | "errorEnum";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    functionCount: number;
    structCount: number;
    enumCount: number;
    unionCount: number;
    errorEnumCount: number;
    documentedFunctions: number;
  };
}

/**
 * Validates a normalized contract specification AST for common interface anti-patterns,
 * missing documentation, shadowing, and unsupported data definitions.
 */
export function validateContractSpec(ast: ContractSpecAST): ValidationResult {
  const issues: ValidationIssue[] = [];
  let documentedFunctions = 0;

  // 1. Functions validation
  const seenFunctionNames = new Set<string>();
  for (const fn of ast.functions) {
    if (seenFunctionNames.has(fn.name)) {
      issues.push({
        severity: "error",
        entityName: fn.name,
        entityType: "function",
        message: `Duplicate function signature '${fn.name}' detected.`,
      });
    }
    seenFunctionNames.add(fn.name);

    if (fn.doc.trim().length > 0) {
      documentedFunctions++;
    } else {
      issues.push({
        severity: "info",
        entityName: fn.name,
        entityType: "function",
        message: `Function '${fn.name}' is missing docstring comments.`,
      });
    }

    // Check duplicate parameter names
    const seenParamNames = new Set<string>();
    for (const param of fn.inputs) {
      if (seenParamNames.has(param.name)) {
        issues.push({
          severity: "error",
          entityName: `${fn.name}.${param.name}`,
          entityType: "function",
          message: `Duplicate parameter '${param.name}' in function '${fn.name}'.`,
        });
      }
      seenParamNames.add(param.name);
    }
  }

  // 2. Struct validation
  for (const s of ast.structs) {
    if (s.fields.length === 0) {
      issues.push({
        severity: "warning",
        entityName: s.name,
        entityType: "struct",
        message: `Struct '${s.name}' has no defined fields.`,
      });
    }
  }

  // 3. Enum validation
  for (const e of ast.enums) {
    if (e.cases.length === 0) {
      issues.push({
        severity: "warning",
        entityName: e.name,
        entityType: "enum",
        message: `Enum '${e.name}' has no defined cases.`,
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    valid: !hasErrors,
    issues,
    stats: {
      functionCount: ast.functions.length,
      structCount: ast.structs.length,
      enumCount: ast.enums.length,
      unionCount: ast.unions.length,
      errorEnumCount: ast.errorEnums.length,
      documentedFunctions,
    },
  };
}
