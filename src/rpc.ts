import { rpc, xdr, Address } from "@stellar/stellar-sdk";
import { ContractSpecAST } from "./ast.js";
import { parseSpecEntriesFromBuffers, normalizeSpecEntries } from "./parser.js";
import { extractSpecBytesFromWasm } from "./wasm.js";
import { RpcFetchError, UnsupportedExecutableError } from "./errors.js";

export interface FetchSpecRpcOptions {
  rpcUrl: string;
  contractId: string;
  allowHttp?: boolean;
}

/**
 * Retrieves and parses a contract specification from a Soroban RPC endpoint by querying ledger entries.
 *
 * 1. Queries the ContractData ledger entry for the contract instance.
 * 2. Resolves the executable type (WASM hash vs Stellar Asset / built-in).
 * 3. Retrieves the ContractCode ledger entry corresponding to the WASM hash.
 * 4. Extracts and normalizes the embedded contract specification.
 */
export async function fetchSpecFromRpc(options: FetchSpecRpcOptions): Promise<ContractSpecAST> {
  const { rpcUrl, contractId, allowHttp } = options;
  let server: rpc.Server;
  try {
    server = new rpc.Server(rpcUrl, { allowHttp: allowHttp ?? rpcUrl.startsWith("http://") });
  } catch (err) {
    throw new RpcFetchError(`Failed to initialize Soroban RPC client: ${(err as Error).message}`, err);
  }

  let contractAddress: Address;
  try {
    contractAddress = Address.fromString(contractId);
  } catch (err) {
    throw new RpcFetchError(`Invalid contract ID format: ${contractId}`, err);
  }

  // 1. Ledger key for contract instance
  const contractInstanceKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: contractAddress.toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent,
    })
  );

  let ledgerEntryResponse: rpc.Api.GetLedgerEntriesResponse;
  try {
    ledgerEntryResponse = await server.getLedgerEntries(contractInstanceKey);
  } catch (err) {
    throw new RpcFetchError(`Failed to fetch contract instance ledger entry: ${(err as Error).message}`, err);
  }

  const entries = ledgerEntryResponse.entries;
  if (!entries || entries.length === 0 || !entries[0]) {
    throw new RpcFetchError(`Contract instance ledger entry not found for contract ${contractId}`);
  }

  const instanceEntry = entries[0];
  const ledgerEntryData = instanceEntry.val;
  const contractData = (ledgerEntryData as any).contractData();
  const instanceVal = contractData.val();

  if (instanceVal.switch().name !== "scvContractInstance") {
    throw new RpcFetchError(`Expected scvContractInstance, received: ${instanceVal.switch().name}`);
  }

  const instance = instanceVal.instance();
  const executable = instance.executable();
  const execType = executable.switch().name;

  if (execType === "contractExecutableStellarAsset") {
    throw new UnsupportedExecutableError(
      "Contract is a native Stellar Asset contract without a WASM contract specification."
    );
  }

  if (execType !== "contractExecutableWasm") {
    throw new UnsupportedExecutableError(`Unsupported contract executable type: ${execType}`);
  }

  const wasmHash = executable.wasmHash();

  // 2. Ledger key for contract code
  const contractCodeKey = xdr.LedgerKey.contractCode(
    new xdr.LedgerKeyContractCode({
      hash: wasmHash,
    })
  );

  let codeResponse: rpc.Api.GetLedgerEntriesResponse;
  try {
    codeResponse = await server.getLedgerEntries(contractCodeKey);
  } catch (err) {
    throw new RpcFetchError(`Failed to fetch contract code for WASM hash: ${(err as Error).message}`, err);
  }

  const codeEntries = codeResponse.entries;
  if (!codeEntries || codeEntries.length === 0 || !codeEntries[0]) {
    throw new RpcFetchError(`Contract code ledger entry not found for WASM hash ${wasmHash.toString("hex")}`);
  }

  const codeEntry = codeEntries[0];
  const codeVal = (codeEntry.val as any).contractCode();
  const codeBody = codeVal.code();

  const wasmBuffer = Buffer.from(codeBody);
  const specBuffers = extractSpecBytesFromWasm(wasmBuffer);
  const specEntries = parseSpecEntriesFromBuffers(specBuffers);
  return normalizeSpecEntries(specEntries);
}
