import { randomUUID } from "node:crypto";
import { open, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_PAGE_SIZE = 10_000;
const CONTRACT_ID_PATTERN = /^C[A-Z2-7]{55}$/;

export async function exportEvents({
  rpcUrl,
  startLedger,
  endLedger,
  contractIds,
  outputPath,
  pageSize = 100,
  timeoutMs = 10_000,
  fetchImpl = fetch,
}) {
  validateOptions({ rpcUrl, startLedger, endLedger, contractIds, outputPath, pageSize, timeoutMs });

  const output = resolve(outputPath);
  const temporaryPath = `${output}.tmp-${randomUUID()}`;
  let handle;
  const eventIds = new Set();
  const cursors = new Set();
  let pages = 0;
  let eventsWritten = 0;
  let latestLedger;

  try {
    handle = await open(temporaryPath, "wx");
    let params = {
      startLedger,
      endLedger,
      filters: [{ type: "contract", contractIds }],
      pagination: { limit: pageSize },
    };

    while (true) {
      const result = await getEvents(rpcUrl, params, timeoutMs, fetchImpl);
      if (!Array.isArray(result.events)) {
        throw new Error("getEvents result is missing its events array");
      }
      pages += 1;
      latestLedger = result.latestLedger;

      const lines = [];
      for (const event of result.events) {
        if (typeof event?.id !== "string" || event.id.length === 0) {
          throw new Error("getEvents returned an event without a valid id");
        }
        if (!eventIds.has(event.id)) {
          eventIds.add(event.id);
          lines.push(JSON.stringify(event));
          eventsWritten += 1;
        }
      }
      if (lines.length > 0) {
        await handle.writeFile(`${lines.join("\n")}\n`);
      }

      const cursor = result.cursor;
      if (cursor === undefined || cursor === null || cursor === "") {
        break;
      }
      if (typeof cursor !== "string") {
        throw new Error("getEvents returned an invalid pagination cursor");
      }
      if (cursors.has(cursor)) {
        throw new Error("getEvents repeated a pagination cursor; stopping to avoid an infinite loop");
      }
      cursors.add(cursor);
      params = {
        filters: [{ type: "contract", contractIds }],
        pagination: { cursor, limit: pageSize },
      };
    }

    await handle.close();
    handle = undefined;
    await rename(temporaryPath, output);
    return { output, pages, events: eventsWritten, latestLedger };
  } catch (error) {
    const cleanupErrors = [error];
    if (handle) {
      try {
        await handle.close();
      } catch (closeError) {
        cleanupErrors.push(closeError);
      }
    }
    if (cleanupErrors.length > 1) {
      throw new AggregateError(cleanupErrors, "Event export failed and temporary-file cleanup was incomplete");
    }
    throw error;
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function getEvents(rpcUrl, params, timeoutMs, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getEvents",
        params,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(`Soroban RPC request failed: ${error.message}`, { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Soroban RPC returned HTTP status ${response.status}`);
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("Soroban RPC returned invalid JSON", { cause: error });
  }
  if (body === null || typeof body !== "object") {
    throw new Error("Soroban RPC returned an invalid response object");
  }
  if (body.error) {
    throw new Error(`getEvents RPC error ${body.error.code}: ${body.error.message}`);
  }
  if (!body.result || typeof body.result !== "object") {
    throw new Error("Soroban RPC response is missing its result");
  }
  return body.result;
}

function validateOptions({ rpcUrl, startLedger, endLedger, contractIds, outputPath, pageSize, timeoutMs }) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rpcUrl);
  } catch {
    throw new TypeError("rpcUrl must be an absolute HTTP or HTTPS URL");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
    throw new TypeError("rpcUrl must be an HTTP or HTTPS URL without embedded credentials");
  }
  if (!Number.isSafeInteger(startLedger) || startLedger < 1) {
    throw new TypeError("startLedger must be a positive safe integer");
  }
  if (!Number.isSafeInteger(endLedger) || endLedger <= startLedger) {
    throw new TypeError("endLedger must be a safe integer greater than startLedger");
  }
  if (!Array.isArray(contractIds) || contractIds.length < 1 || contractIds.length > 5) {
    throw new TypeError("provide between one and five contract IDs");
  }
  if (contractIds.some((id) => typeof id !== "string" || !CONTRACT_ID_PATTERN.test(id))) {
    throw new TypeError("contract IDs must be valid Stellar contract StrKeys");
  }
  if (new Set(contractIds).size !== contractIds.length) {
    throw new TypeError("contract IDs must not contain duplicates");
  }
  if (typeof outputPath !== "string" || outputPath.trim() === "") {
    throw new TypeError("outputPath must be a non-empty file path");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new TypeError(`pageSize must be an integer from 1 to ${MAX_PAGE_SIZE}`);
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError("timeoutMs must be a positive safe integer");
  }
}
