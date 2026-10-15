# Soroban Event Snapshot

`soroban-event-snapshot` exports Soroban contract events for an explicit ledger
range to newline-delimited JSON (JSONL). It is a dependency-free JavaScript CLI
for repeatable local snapshots and small ingestion jobs; it does not decode or
assume a schema for XDR-encoded event topics and values.

[**Read the documentation**](https://kairo-solutions.github.io/soroban-event-snapshot/)

## Usage

Requires Node.js 20 or newer and a Soroban RPC endpoint with the requested
ledger range available in its retained history.

```sh
npm install
node src/cli.js \
  --rpc-url https://soroban-testnet.stellar.org \
  --start-ledger 199616 \
  --end-ledger 199700 \
  --contract-id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --output events.jsonl
```

The range is half-open: `start-ledger` is included and `end-ledger` is excluded.
Repeat `--contract-id` to select up to five contracts. `--page-size` accepts
values from 1 to 10,000, and `--timeout-ms` sets the timeout for each RPC
request. The CLI follows the Soroban RPC cursor, deduplicates returned events by
their `id`, and writes one event object per line.

Output is written to a temporary file and replaces the destination only after
all pages succeed. A failed fetch leaves an existing destination untouched.
RPC event history is bounded by the server's retention window; use
`getHealth`'s `oldestLedger` and `latestLedger` to select an available range.

## Development

```sh
npm test
```

The project uses the Soroban RPC `getEvents` method and standard Node.js APIs;
it does not use React or require runtime packages.
