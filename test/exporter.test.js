import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { exportEvents } from "../src/exporter.js";

const contractId = `C${"A".repeat(55)}`;

async function withRpcServer(handler, callback) {
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    handler(body, response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("exports cursor pages, deduplicates event IDs, and atomically writes JSONL", async () => {
  const directory = await mkdtemp(join(tmpdir(), "soroban-event-snapshot-"));
  const outputPath = join(directory, "events.jsonl");
  const requests = [];
  try {
    await withRpcServer((body, response) => {
      requests.push(body);
      response.setHeader("content-type", "application/json");
      const result = body.params.pagination.cursor
        ? {
            latestLedger: 42,
            events: [{ id: "event-2", ledger: 11 }, { id: "event-3", ledger: 12 }],
          }
        : {
            latestLedger: 42,
            cursor: "next-page",
            events: [{ id: "event-1", ledger: 10 }, { id: "event-2", ledger: 11 }],
          };
      response.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
    }, async (rpcUrl) => {
      const summary = await exportEvents({
        rpcUrl,
        startLedger: 10,
        endLedger: 20,
        contractIds: [contractId],
        outputPath,
        pageSize: 2,
      });

      assert.equal(summary.pages, 2);
      assert.equal(summary.events, 3);
      assert.equal(summary.latestLedger, 42);
      assert.deepEqual(
        (await readFile(outputPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line).id),
        ["event-1", "event-2", "event-3"],
      );
    });

    assert.deepEqual(requests[0].params, {
      startLedger: 10,
      endLedger: 20,
      filters: [{ type: "contract", contractIds: [contractId] }],
      pagination: { limit: 2 },
    });
    assert.deepEqual(requests[1].params, {
      filters: [{ type: "contract", contractIds: [contractId] }],
      pagination: { cursor: "next-page", limit: 2 },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("failed pagination preserves existing output and removes temporary files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "soroban-event-snapshot-"));
  const outputPath = join(directory, "events.jsonl");
  try {
    await writeFile(outputPath, "previous snapshot\n");
    await withRpcServer((body, response) => {
      response.setHeader("content-type", "application/json");
      if (body.params.pagination.cursor) {
        response.end(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -1, message: "history unavailable" },
        }));
        return;
      }
      response.end(JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: { cursor: "next-page", events: [{ id: "partial", ledger: 10 }] },
      }));
    }, async (rpcUrl) => {
      await assert.rejects(
        exportEvents({
          rpcUrl,
          startLedger: 10,
          endLedger: 20,
          contractIds: [contractId],
          outputPath,
        }),
        /getEvents RPC error -1: history unavailable/,
      );
    });

    assert.equal(await readFile(outputPath, "utf8"), "previous snapshot\n");
    assert.deepEqual(await readdir(directory), ["events.jsonl"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("validates contract IDs and bounded page size before making requests", async () => {
  await assert.rejects(
    exportEvents({
      rpcUrl: "https://soroban-testnet.stellar.org",
      startLedger: 10,
      endLedger: 20,
      contractIds: ["not-a-contract-id"],
      outputPath: "/tmp/events.jsonl",
    }),
    /valid Stellar contract StrKeys/,
  );
  await assert.rejects(
    exportEvents({
      rpcUrl: "https://soroban-testnet.stellar.org",
      startLedger: 10,
      endLedger: 20,
      contractIds: [contractId],
      outputPath: "/tmp/events.jsonl",
      pageSize: 10_001,
    }),
    /pageSize must be an integer/,
  );
});
