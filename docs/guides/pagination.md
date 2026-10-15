# Pagination and output

## Ledger ranges and cursors

The first `getEvents` call includes `startLedger`, `endLedger`, contract filters,
and a page limit. Later calls use the opaque response cursor and repeat the
same contract filter and limit. The exporter stops when the server returns no
next cursor.

The range is half-open: `[startLedger, endLedger)`. Soroban RPC retains a
bounded history. Check the node's `getHealth` response for `oldestLedger`,
`latestLedger`, and `ledgerRetentionWindow` before selecting a range.

## JSONL file semantics

Each output line is one JSON event object returned by Soroban RPC. Objects are
not decoded or normalized. Duplicate event IDs across pages are written once.

The exporter writes to a unique temporary file in the destination directory.
It replaces the destination only after all requests and writes succeed. If a
request fails, an existing destination remains unchanged and the temporary file
is removed.

## Errors and exit behavior

Network failures, non-success HTTP responses, JSON-RPC errors, malformed
responses, invalid cursors, and file-system errors are reported rather than
silently converted to an empty snapshot. The CLI exits non-zero when an export
fails. Make sure the destination directory exists and is writable.

The RPC server is authoritative for the available range; this tool does not
attempt to recover unavailable older event history.
