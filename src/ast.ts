export type PrimitiveType =
  | "val"
  | "bool"
  | "void"
  | "error"
  | "u32"
  | "i32"
  | "u64"
  | "i64"
  | "timepoint"
  | "duration"
  | "u128"
  | "i128"
  | "u256"
  | "i256"
  | "bytes"
  | "string"
  | "symbol"
  | "address"
  | "muxedAddress";

export type TypeDescriptor =
  | { kind: "primitive"; name: PrimitiveType }
  | { kind: "bytesN"; n: number }
  | { kind: "option"; valueType: TypeDescriptor }
  | { kind: "result"; okType: TypeDescriptor; errorType: TypeDescriptor }
  | { kind: "vec"; elementType: TypeDescriptor }
  | { kind: "map"; keyType: TypeDescriptor; valueType: TypeDescriptor }
  | { kind: "tuple"; elementTypes: TypeDescriptor[] }
  | { kind: "udt"; name: string }
  | { kind: "unsupported"; rawKind: string };

export interface FunctionParamDoc {
  name: string;
  doc: string;
  type: TypeDescriptor;
}

export interface FunctionDoc {
  name: string;
  doc: string;
  inputs: FunctionParamDoc[];
  outputs: TypeDescriptor[];
}

export interface StructFieldDoc {
  name: string;
  doc: string;
  type: TypeDescriptor;
}

export interface StructDoc {
  name: string;
  doc: string;
  lib: string;
  fields: StructFieldDoc[];
}

export interface EnumCaseDoc {
  name: string;
  doc: string;
  value: number;
}

export interface EnumDoc {
  name: string;
  doc: string;
  lib: string;
  cases: EnumCaseDoc[];
}

export interface ErrorEnumCaseDoc {
  name: string;
  doc: string;
  value: number;
}

export interface ErrorEnumDoc {
  name: string;
  doc: string;
  lib: string;
  cases: ErrorEnumCaseDoc[];
}

export interface UnionCaseVoidDoc {
  kind: "void";
  name: string;
  doc: string;
}

export interface UnionCaseTupleDoc {
  kind: "tuple";
  name: string;
  doc: string;
  types: TypeDescriptor[];
}

export type UnionCaseDoc = UnionCaseVoidDoc | UnionCaseTupleDoc;

export interface UnionDoc {
  name: string;
  doc: string;
  lib: string;
  cases: UnionCaseDoc[];
}

export interface ContractEventDoc {
  name: string;
  doc: string;
}

export interface ContractSpecAST {
  functions: FunctionDoc[];
  structs: StructDoc[];
  enums: EnumDoc[];
  unions: UnionDoc[];
  errorEnums: ErrorEnumDoc[];
  events: ContractEventDoc[];
}
