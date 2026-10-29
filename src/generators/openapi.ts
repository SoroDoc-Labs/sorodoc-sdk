import {
  ContractSpecAST,
  TypeDescriptor,
  EnumCaseDoc,
  ErrorEnumCaseDoc,
} from "../ast.js";

/**
 * Maps a Soroban AST TypeDescriptor to an OpenAPI 3.0 Schema Object.
 */
export function formatOpenApiSchema(type: TypeDescriptor): Record<string, unknown> {
  switch (type.kind) {
    case "primitive":
      switch (type.name) {
        case "bool":
          return { type: "boolean" };
        case "void":
          return {};
        case "u32":
        case "i32":
          return { type: "integer", format: type.name };
        case "u64":
        case "i64":
        case "u128":
        case "i128":
        case "u256":
        case "i256":
        case "timepoint":
        case "duration":
          return { type: "string", format: type.name, description: "64-bit to 256-bit integer represented as decimal string" };
        case "string":
        case "symbol":
          return { type: "string" };
        case "address":
        case "muxedAddress":
          return { type: "string", description: "Stellar Account or Contract Address (e.g. G... or C...)" };
        case "bytes":
          return { type: "string", format: "byte" };
        case "val":
          return { description: "Arbitrary Soroban ScVal" };
        case "error":
          return { type: "object", properties: { code: { type: "integer" }, message: { type: "string" } } };
      }
      break;

    case "bytesN":
      return { type: "string", format: "byte", description: `Fixed size ${type.n}-byte payload` };

    case "option":
      return {
        oneOf: [
          formatOpenApiSchema(type.valueType),
          { type: "null" },
        ],
      };

    case "result":
      return {
        oneOf: [
          {
            type: "object",
            properties: { ok: formatOpenApiSchema(type.okType) },
            required: ["ok"],
          },
          {
            type: "object",
            properties: { err: formatOpenApiSchema(type.errorType) },
            required: ["err"],
          },
        ],
      };

    case "vec":
      return {
        type: "array",
        items: formatOpenApiSchema(type.elementType),
      };

    case "map":
      return {
        type: "object",
        additionalProperties: formatOpenApiSchema(type.valueType),
      };

    case "tuple":
      return {
        type: "array",
        items: {},
        description: `Tuple of ${type.elementTypes.length} elements`,
        prefixItems: type.elementTypes.map(formatOpenApiSchema),
      };

    case "udt":
      return {
        $ref: `#/components/schemas/${type.name}`,
      };

    case "unsupported":
      return {
        description: `Unsupported Soroban type: ${type.rawKind}`,
      };
  }

  return {};
}

export interface OpenApiOptions {
  title?: string;
  version?: string;
  description?: string;
  contractId?: string;
}

/**
 * Generates an OpenAPI 3.0 schema representing contract functions as invocation endpoints.
 * Explicitly states that this represents smart contract interface definitions, not a deployed HTTP REST API.
 */
export function generateOpenApi(ast: ContractSpecAST, options: OpenApiOptions = {}): Record<string, unknown> {
  const title = options.title || "Soroban Contract Interface";
  const version = options.version || "1.0.0";
  const disclaimer =
    "NOTICE: This OpenAPI 3.0 document is a typed schema representation of Soroban smart contract functions. " +
    "It maps contract invocation signatures into standard OpenAPI paths for documentation and client generation; " +
    "it does not denote that a direct HTTP web server is running on the blockchain.";

  const description = options.description ? `${options.description}\n\n${disclaimer}` : disclaimer;

  const paths: Record<string, unknown> = {};

  for (const fn of ast.functions) {
    const requestBodyProps: Record<string, unknown> = {};
    const requiredProps: string[] = [];

    for (const input of fn.inputs) {
      requestBodyProps[input.name] = {
        ...formatOpenApiSchema(input.type),
        description: input.doc || undefined,
      };
      requiredProps.push(input.name);
    }

    const responseSchema =
      fn.outputs.length === 1
        ? formatOpenApiSchema(fn.outputs[0]!)
        : fn.outputs.length > 1
        ? {
            type: "array",
            prefixItems: fn.outputs.map(formatOpenApiSchema),
          }
        : { type: "object" };

    paths[`/functions/${fn.name}`] = {
      post: {
        summary: `Invoke '${fn.name}' function`,
        description: fn.doc || `Call contract function '${fn.name}'`,
        operationId: fn.name,
        requestBody:
          fn.inputs.length > 0
            ? {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: requestBodyProps,
                      required: requiredProps,
                    },
                  },
                },
              }
            : undefined,
        responses: {
          "200": {
            description: "Successful invocation result",
            content: {
              "application/json": {
                schema: responseSchema,
              },
            },
          },
        },
      },
    };
  }

  const schemas: Record<string, unknown> = {};

  for (const s of ast.structs) {
    const props: Record<string, unknown> = {};
    const req: string[] = [];
    for (const f of s.fields) {
      props[f.name] = {
        ...formatOpenApiSchema(f.type),
        description: f.doc || undefined,
      };
      req.push(f.name);
    }
    schemas[s.name] = {
      type: "object",
      description: s.doc || undefined,
      properties: props,
      required: req,
    };
  }

  for (const e of ast.enums) {
    schemas[e.name] = {
      type: "integer",
      description: e.doc || undefined,
      enum: e.cases.map((c: EnumCaseDoc) => c.value),
    };
  }

  for (const ee of ast.errorEnums) {
    schemas[ee.name] = {
      type: "integer",
      description: ee.doc || undefined,
      enum: ee.cases.map((c: ErrorEnumCaseDoc) => c.value),
    };
  }

  return {
    openapi: "3.0.3",
    info: {
      title,
      version,
      description,
      ...(options.contractId ? { "x-soroban-contract-id": options.contractId } : {}),
    },
    paths,
    components: {
      schemas,
    },
  };
}
