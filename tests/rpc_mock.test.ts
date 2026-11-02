import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { fetchSpecFromRpc } from "../src/rpc.js";
import { RpcFetchError, UnsupportedExecutableError } from "../src/errors.js";
import { xdr } from "@stellar/stellar-sdk";

// Mock Soroban RPC server
describe("Soroban RPC Mock Server Integration", () => {
  let mockServer: http.Server;
  let serverPort: number;

  const validWasmBuffer = fs.readFileSync(path.resolve(__dirname, "../fixtures/increment.wasm"));
  const wasmHashBuffer = Buffer.alloc(32, 9); // dummy wasm hash

  beforeAll(async () => {
    mockServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (json.method === "getLedgerEntries") {
            const keys = Array.isArray(json.params) ? json.params[0] : json.params?.keys || [];
            // Parse requested key
            const reqKeyB64 = keys[0];
            const parsedKey = xdr.LedgerKey.fromXDR(reqKeyB64, "base64");

            if (parsedKey.type === "contractData") {
              const contractAddr = Buffer.from(
                (parsedKey.contractData.contract as any).contractId.value
              ).toString("hex");
              // Case 1: missing contract
              if (contractAddr === "0000000000000000000000000000000000000000000000000000000000000001") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ jsonrpc: "2.0", id: json.id, result: { entries: [] } }));
                return;
              }

              // Case 2: unsupported executable (Stellar Asset)
              if (contractAddr === "0000000000000000000000000000000000000000000000000000000000000002") {
                const assetExec = xdr.ContractExecutable.contractExecutableStellarAsset();
                const instance = new xdr.ScContractInstance({
                  executable: assetExec,
                  storage: null,
                });
                const contractDataVal = xdr.ScVal.scvContractInstance(instance);
                const ledgerEntryData = xdr.LedgerEntryData.contractData(
                  new xdr.ContractDataEntry({
                    ext: xdr.ExtensionPoint.v0(),
                    contract: parsedKey.contractData.contract,
                    key: parsedKey.contractData.key,
                    durability: xdr.ContractDataDurability.persistent,
                    val: contractDataVal,
                  })
                );
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: json.id,
                    result: {
                      entries: [
                        {
                          key: reqKeyB64,
                          xdr: ledgerEntryData.toXDR("base64"),
                          lastModifiedLedgerSeq: 100,
                        },
                      ],
                    },
                  })
                );
                return;
              }

              // Case 3: valid contract instance pointing to WASM hash
              if (contractAddr === "0000000000000000000000000000000000000000000000000000000000000003") {
                const wasmExec = xdr.ContractExecutable.contractExecutableWasm(wasmHashBuffer);
                const instance = new xdr.ScContractInstance({
                  executable: wasmExec,
                  storage: null,
                });
                const contractDataVal = xdr.ScVal.scvContractInstance(instance);
                const ledgerEntryData = xdr.LedgerEntryData.contractData(
                  new xdr.ContractDataEntry({
                    ext: xdr.ExtensionPoint.v0(),
                    contract: parsedKey.contractData.contract,
                    key: parsedKey.contractData.key,
                    durability: xdr.ContractDataDurability.persistent,
                    val: contractDataVal,
                  })
                );
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: json.id,
                    result: {
                      entries: [
                        {
                          key: reqKeyB64,
                          xdr: ledgerEntryData.toXDR("base64"),
                          lastModifiedLedgerSeq: 100,
                        },
                      ],
                    },
                  })
                );
                return;
              }
            }

            if (parsedKey.type === "contractCode") {
              const requestedHash = Buffer.from(parsedKey.contractCode.hash.value);
              if (requestedHash.equals(wasmHashBuffer)) {
                const codeEntry = xdr.LedgerEntryData.contractCode(
                  new xdr.ContractCodeEntry({
                    ext: xdr.ExtensionPoint.v0(),
                    hash: wasmHashBuffer,
                    code: validWasmBuffer,
                  })
                );
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: json.id,
                    result: {
                      entries: [
                        {
                          key: reqKeyB64,
                          xdr: codeEntry.toXDR("base64"),
                          lastModifiedLedgerSeq: 100,
                        },
                      ],
                    },
                  })
                );
                return;
              }
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", id: json.id, result: { entries: [] } }));
          } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Unknown method" }));
          }
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        const addr = mockServer.address();
        serverPort = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (mockServer) {
      await new Promise((resolve) => mockServer.close(resolve));
    }
  });

  it("handles missing contract instance ledger entry with RpcFetchError", async () => {
    // Contract ID with hex 00000...01
    const dummyContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
    await expect(
      fetchSpecFromRpc({
        rpcUrl: `http://127.0.0.1:${serverPort}`,
        contractId: dummyContractId,
        allowHttp: true,
      })
    ).rejects.toThrow(RpcFetchError);
  });

  it("identifies native Stellar Asset contracts with UnsupportedExecutableError", async () => {
    // Contract address that triggers assetExec mock
    const assetContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4";
    await expect(
      fetchSpecFromRpc({
        rpcUrl: `http://127.0.0.1:${serverPort}`,
        contractId: assetContractId,
        allowHttp: true,
      })
    ).rejects.toThrow(UnsupportedExecutableError);
  });

  it("successfully fetches contract instance, queries contract code, and normalizes AST", async () => {
    const validContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHK3M";
    const ast = await fetchSpecFromRpc({
      rpcUrl: `http://127.0.0.1:${serverPort}`,
      contractId: validContractId,
      allowHttp: true,
    });

    expect(ast.functions.length).toBeGreaterThan(0);
    expect(ast.functions.some((f) => f.name === "increment")).toBe(true);
  });
});
