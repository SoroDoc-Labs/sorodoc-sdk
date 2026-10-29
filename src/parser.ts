import { xdr } from "@stellar/stellar-sdk";
import { Reader } from "@stellar/js-xdr";
import {
  ContractSpecAST,
  FunctionDoc,
  FunctionParamDoc,
  StructDoc,
  StructFieldDoc,
  EnumDoc,
  EnumCaseDoc,
  ErrorEnumDoc,
  ErrorEnumCaseDoc,
  UnionDoc,
  UnionCaseDoc,
  ContractEventDoc,
  TypeDescriptor,
} from "./ast.js";
import { UnsupportedSpecEntryError } from "./errors.js";

/**
 * Normalizes an XDR ScSpecTypeDef into a clean AST TypeDescriptor.
 */
export function normalizeTypeDef(typeDef: xdr.ScSpecTypeDef): TypeDescriptor {
  const typeKind = typeDef.type;

  switch (typeKind) {
    case "scSpecTypeVal":
      return { kind: "primitive", name: "val" };
    case "scSpecTypeBool":
      return { kind: "primitive", name: "bool" };
    case "scSpecTypeVoid":
      return { kind: "primitive", name: "void" };
    case "scSpecTypeError":
      return { kind: "primitive", name: "error" };
    case "scSpecTypeU32":
      return { kind: "primitive", name: "u32" };
    case "scSpecTypeI32":
      return { kind: "primitive", name: "i32" };
    case "scSpecTypeU64":
      return { kind: "primitive", name: "u64" };
    case "scSpecTypeI64":
      return { kind: "primitive", name: "i64" };
    case "scSpecTypeTimepoint":
      return { kind: "primitive", name: "timepoint" };
    case "scSpecTypeDuration":
      return { kind: "primitive", name: "duration" };
    case "scSpecTypeU128":
      return { kind: "primitive", name: "u128" };
    case "scSpecTypeI128":
      return { kind: "primitive", name: "i128" };
    case "scSpecTypeU256":
      return { kind: "primitive", name: "u256" };
    case "scSpecTypeI256":
      return { kind: "primitive", name: "i256" };
    case "scSpecTypeBytes":
      return { kind: "primitive", name: "bytes" };
    case "scSpecTypeString":
      return { kind: "primitive", name: "string" };
    case "scSpecTypeSymbol":
      return { kind: "primitive", name: "symbol" };
    case "scSpecTypeAddress":
      return { kind: "primitive", name: "address" };
    case "scSpecTypeMuxedAddress":
      return { kind: "primitive", name: "muxedAddress" };

    case "scSpecTypeBytesN": {
      const bytesN = (typeDef as any).bytesN?.() || (typeDef as any).bytesN;
      const n = typeof bytesN?.n === "function" ? bytesN.n() : Number(bytesN?.n ?? 0);
      return { kind: "bytesN", n };
    }

    case "scSpecTypeOption": {
      const opt = (typeDef as any).option?.() || (typeDef as any).option;
      const innerTypeDef = typeof opt?.valueType === "function" ? opt.valueType() : opt?.valueType;
      return { kind: "option", valueType: normalizeTypeDef(innerTypeDef) };
    }

    case "scSpecTypeResult": {
      const res = (typeDef as any).result?.() || (typeDef as any).result;
      const okType = typeof res?.okType === "function" ? res.okType() : res?.okType;
      const errorType = typeof res?.errorType === "function" ? res.errorType() : res?.errorType;
      return {
        kind: "result",
        okType: normalizeTypeDef(okType),
        errorType: normalizeTypeDef(errorType),
      };
    }

    case "scSpecTypeVec": {
      const vec = (typeDef as any).vec?.() || (typeDef as any).vec;
      const elementType = typeof vec?.elementType === "function" ? vec.elementType() : vec?.elementType;
      return { kind: "vec", elementType: normalizeTypeDef(elementType) };
    }

    case "scSpecTypeMap": {
      const map = (typeDef as any).map?.() || (typeDef as any).map;
      const keyType = typeof map?.keyType === "function" ? map.keyType() : map?.keyType;
      const valueType = typeof map?.valueType === "function" ? map.valueType() : map?.valueType;
      return {
        kind: "map",
        keyType: normalizeTypeDef(keyType),
        valueType: normalizeTypeDef(valueType),
      };
    }

    case "scSpecTypeTuple": {
      const tuple = (typeDef as any).tuple?.() || (typeDef as any).tuple;
      const elementTypesRaw = typeof tuple?.valueTypes === "function" ? tuple.valueTypes() : tuple?.valueTypes || [];
      const elementTypes = (elementTypesRaw as xdr.ScSpecTypeDef[]).map((t) => normalizeTypeDef(t));
      return { kind: "tuple", elementTypes };
    }

    case "scSpecTypeUdt": {
      const udt = (typeDef as any).udt?.() || (typeDef as any).udt;
      const name = typeof udt?.name === "function" ? udt.name().toString() : udt?.name?.toString() || "";
      return { kind: "udt", name };
    }

    default:
      return { kind: "unsupported", rawKind: String(typeKind) };
  }
}

/**
 * Parses raw spec byte buffers (from WASM custom section) into XDR ScSpecEntry array.
 */
export function parseSpecEntriesFromBuffers(specBuffers: Buffer[]): xdr.ScSpecEntry[] {
  const entries: xdr.ScSpecEntry[] = [];

  for (const buf of specBuffers) {
    const reader = new Reader(buf);
    while (reader.remaining > 0) {
      // ScSpecEntry schema._read decodes variable-length consecutive entries
      const rawEntry = (xdr.ScSpecEntry as any).schema._read(reader);
      const entry = (xdr.ScSpecEntry as any).fromXdrObject(rawEntry) as xdr.ScSpecEntry;
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Converts XDR ScSpecEntry instances into a normalized, deterministic AST.
 */
export function normalizeSpecEntries(entries: xdr.ScSpecEntry[]): ContractSpecAST {
  const functions: FunctionDoc[] = [];
  const structs: StructDoc[] = [];
  const enums: EnumDoc[] = [];
  const unions: UnionDoc[] = [];
  const errorEnums: ErrorEnumDoc[] = [];
  const events: ContractEventDoc[] = [];

  for (const entry of entries) {
    const kind = entry.type;

    switch (kind) {
      case "scSpecEntryFunctionV0": {
        const fn = (entry as any).functionV0;
        const fnDoc = fn.doc?.toString() ?? "";
        const fnName = fn.name?.toString() ?? "";

        const inputs: FunctionParamDoc[] = (fn.inputs || []).map((input: any) => ({
          name: input.name?.toString() ?? "",
          doc: input.doc?.toString() ?? "",
          type: normalizeTypeDef(input.type),
        }));

        const outputs: TypeDescriptor[] = (fn.outputs || []).map((output: any) => normalizeTypeDef(output));

        functions.push({
          name: fnName,
          doc: fnDoc,
          inputs,
          outputs,
        });
        break;
      }

      case "scSpecEntryUdtStructV0": {
        const s = (entry as any).udtStructV0;
        const structName = s.name?.toString() ?? "";
        const structDoc = s.doc?.toString() ?? "";
        const structLib = s.lib?.toString() ?? "";

        const fields: StructFieldDoc[] = (s.fields || []).map((field: any) => ({
          name: field.name?.toString() ?? "",
          doc: field.doc?.toString() ?? "",
          type: normalizeTypeDef(field.type),
        }));

        structs.push({
          name: structName,
          doc: structDoc,
          lib: structLib,
          fields,
        });
        break;
      }

      case "scSpecEntryUdtEnumV0": {
        const e = (entry as any).udtEnumV0;
        const enumName = e.name?.toString() ?? "";
        const enumDoc = e.doc?.toString() ?? "";
        const enumLib = e.lib?.toString() ?? "";

        const cases: EnumCaseDoc[] = (e.cases || []).map((c: any) => ({
          name: c.name?.toString() ?? "",
          doc: c.doc?.toString() ?? "",
          value: Number(c.value),
        }));

        enums.push({
          name: enumName,
          doc: enumDoc,
          lib: enumLib,
          cases,
        });
        break;
      }

      case "scSpecEntryUdtErrorEnumV0": {
        const ee = (entry as any).udtErrorEnumV0;
        const errorName = ee.name?.toString() ?? "";
        const errorDoc = ee.doc?.toString() ?? "";
        const errorLib = ee.lib?.toString() ?? "";

        const cases: ErrorEnumCaseDoc[] = (ee.cases || []).map((c: any) => ({
          name: c.name?.toString() ?? "",
          doc: c.doc?.toString() ?? "",
          value: Number(c.value),
        }));

        errorEnums.push({
          name: errorName,
          doc: errorDoc,
          lib: errorLib,
          cases,
        });
        break;
      }

      case "scSpecEntryUdtUnionV0": {
        const u = (entry as any).udtUnionV0;
        const unionName = u.name?.toString() ?? "";
        const unionDoc = u.doc?.toString() ?? "";
        const unionLib = u.lib?.toString() ?? "";

        const cases: UnionCaseDoc[] = (u.cases || []).map((c: any): UnionCaseDoc => {
          const caseKind = c.kind?.name ?? c.type;
          const caseName = (c.voidCase || c.tupleCase)?.name?.toString() ?? c.name?.toString() ?? "";
          const caseDoc = (c.voidCase || c.tupleCase)?.doc?.toString() ?? c.doc?.toString() ?? "";

          if (caseKind === "scSpecUdtUnionCaseTupleV0" || c.tupleCase) {
            const tupleCase = c.tupleCase || c;
            const typeDefs = tupleCase.type || tupleCase.types || [];
            return {
              kind: "tuple",
              name: caseName,
              doc: caseDoc,
              types: (typeDefs as any[]).map((t) => normalizeTypeDef(t)),
            };
          }

          return {
            kind: "void",
            name: caseName,
            doc: caseDoc,
          };
        });

        unions.push({
          name: unionName,
          doc: unionDoc,
          lib: unionLib,
          cases,
        });
        break;
      }

      case "scSpecEntryEventV0": {
        const ev = (entry as any).eventV0;
        events.push({
          name: ev.name?.toString() ?? "",
          doc: ev.doc?.toString() ?? "",
        });
        break;
      }

      default:
        throw new UnsupportedSpecEntryError(String(kind));
    }
  }

  // Deterministically sort entities by name
  functions.sort((a, b) => a.name.localeCompare(b.name));
  structs.sort((a, b) => a.name.localeCompare(b.name));
  enums.sort((a, b) => a.name.localeCompare(b.name));
  unions.sort((a, b) => a.name.localeCompare(b.name));
  errorEnums.sort((a, b) => a.name.localeCompare(b.name));
  events.sort((a, b) => a.name.localeCompare(b.name));

  return {
    functions,
    structs,
    enums,
    unions,
    errorEnums,
    events,
  };
}
