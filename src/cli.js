#!/usr/bin/env node

import { exportEvents } from "./exporter.js";

const USAGE = `Usage:
  soroban-event-snapshot --rpc-url URL --start-ledger N --end-ledger N \\
    --contract-id C... --output events.jsonl [options]

Options:
  --contract-id ID   Contract StrKey to include; repeat up to five times
  --page-size N      Events per RPC page (1-10000; default 100)
  --timeout-ms N     HTTP timeout in milliseconds (default 10000)
  --help             Show this help

The ledger range is [start-ledger, end-ledger). Output is newline-delimited
JSON; the destination is replaced only after every page has been fetched.`;

async function main(args) {
  if (args.includes("--help")) {
    console.log(USAGE);
    return 0;
  }

  const options = parseArgs(args);
  const summary = await exportEvents(options);
  console.log(JSON.stringify(summary, null, 2));
  return 0;
}

function parseArgs(args) {
  const values = new Map();
  const contractIds = [];
  const repeatable = new Set(["--contract-id"]);
  const known = new Set([
    "--rpc-url",
    "--start-ledger",
    "--end-ledger",
    "--contract-id",
    "--output",
    "--page-size",
    "--timeout-ms",
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (!known.has(name)) {
      throw new Error(`unknown option: ${name}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`expected a value after ${name}`);
    }
    index += 1;
    if (repeatable.has(name)) {
      contractIds.push(value);
    } else if (values.has(name)) {
      throw new Error(`option may only be specified once: ${name}`);
    } else {
      values.set(name, value);
    }
  }

  const required = ["--rpc-url", "--start-ledger", "--end-ledger", "--output"];
  for (const name of required) {
    if (!values.has(name)) {
      throw new Error(`missing required option: ${name}`);
    }
  }

  return {
    rpcUrl: values.get("--rpc-url"),
    startLedger: parseInteger(values.get("--start-ledger"), "--start-ledger"),
    endLedger: parseInteger(values.get("--end-ledger"), "--end-ledger"),
    contractIds,
    outputPath: values.get("--output"),
    pageSize: parseInteger(values.get("--page-size") ?? "100", "--page-size"),
    timeoutMs: parseInteger(values.get("--timeout-ms") ?? "10000", "--timeout-ms"),
  };
}

function parseInteger(value, name) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be a safe integer`);
  }
  return parsed;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  },
);
