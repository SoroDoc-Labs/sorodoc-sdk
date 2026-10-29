export class SoroDocError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoroDocError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MalformedWasmError extends SoroDocError {
  constructor(message: string) {
    super(`Malformed WASM: ${message}`);
    this.name = "MalformedWasmError";
  }
}

export class MissingSpecError extends SoroDocError {
  constructor(message = "No 'contractspecv0' custom section found in the provided WASM binary.") {
    super(message);
    this.name = "MissingSpecError";
  }
}

export class UnsupportedSpecEntryError extends SoroDocError {
  constructor(entryKind: string) {
    super(`Unsupported contract specification entry: '${entryKind}'`);
    this.name = "UnsupportedSpecEntryError";
  }
}

export class UnsupportedTypeError extends SoroDocError {
  constructor(typeName: string) {
    super(`Unsupported contract data type: '${typeName}'`);
    this.name = "UnsupportedTypeError";
  }
}

export class RpcFetchError extends SoroDocError {
  constructor(message: string, public readonly causeError?: unknown) {
    super(`RPC Fetch Failure: ${message}`);
    this.name = "RpcFetchError";
  }
}

export class UnsupportedExecutableError extends SoroDocError {
  constructor(message: string) {
    super(`Unsupported contract executable: ${message}`);
    this.name = "UnsupportedExecutableError";
  }
}
