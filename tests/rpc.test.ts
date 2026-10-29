import { describe, it, expect, vi } from "vitest";
import { fetchSpecFromRpc } from "../src/rpc.js";
import { RpcFetchError } from "../src/errors.js";

describe("RPC Spec Retrieval (Offline Unit Tests & Error Guards)", () => {
  it("rejects invalid Stellar contract addresses with RpcFetchError", async () => {
    await expect(
      fetchSpecFromRpc({
        rpcUrl: "http://127.0.0.1:8000",
        contractId: "invalid_contract_id",
      })
    ).rejects.toThrow(RpcFetchError);
  });

  it("handles unreachable RPC server gracefully", async () => {
    // Non-existent loopback port with immediate connection refused
    await expect(
      fetchSpecFromRpc({
        rpcUrl: "http://127.0.0.1:54321/soroban/rpc",
        contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
      })
    ).rejects.toThrow(RpcFetchError);
  });
});
