# CLI and library reference

## CLI

```text
soroban-event-snapshot --rpc-url URL --start-ledger N --end-ledger N \
  --contract-id C... --output events.jsonl [options]
```

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `--rpc-url` | Yes | — | Soroban RPC HTTP or HTTPS endpoint |
| `--start-ledger` | Yes | — | Inclusive starting ledger |
| `--end-ledger` | Yes | — | Exclusive ending ledger |
| `--contract-id` | Yes | — | Contract StrKey; repeat up to five |
| `--output` | Yes | — | Destination JSONL path |
| `--page-size` | No | `100` | Page size from 1 through 10,000 |
| `--timeout-ms` | No | `10000` | Timeout for each HTTP request |
| `--help` | No | — | Print command help |

The command prints a JSON summary containing the resolved output path, number
of pages, unique events written, and latest ledger reported by the server.

## JavaScript API

`exportEvents(options)` is exported from `src/exporter.js`:

```js
const summary = await exportEvents({
  rpcUrl,
  startLedger,
  endLedger,
  contractIds,
  outputPath,
  pageSize: 100,
  timeoutMs: 10_000,
});
```

It resolves to `{ output, pages, events, latestLedger }` on success. It rejects
with an error for invalid options, RPC or JSON-RPC errors, invalid event data,
repeated cursors, and file-system failures. A `fetchImpl` option can be supplied
for testing or specialized integrations.

The package requires Node.js 20 or newer and has no runtime dependencies.
