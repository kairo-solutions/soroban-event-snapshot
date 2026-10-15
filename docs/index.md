# Soroban Event Snapshot

Export filtered Soroban contract events as durable, line-oriented JSON for
local analysis and ingestion.

<div class="docs-hero" markdown>

<div class="docs-hero__intro" markdown>

**SOROBAN EVENT DATA**

## Snapshot a ledger range

Follow the Soroban RPC cursor across pages, deduplicate events by their unique
IDs, and atomically write JSONL without assuming an event schema.

[Get started](guides/quickstart.md){ .md-button .md-button--primary }
[Browse the reference](reference/api.md){ .md-button }

</div>

<div class="docs-hero__example" markdown>

**A quick look**

```sh
node src/cli.js \
  --rpc-url https://soroban-testnet.stellar.org \
  --start-ledger 199616 \
  --end-ledger 199700 \
  --contract-id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --output events.jsonl
```

</div>

</div>

## Designed for reliable exports

<div class="docs-capabilities" markdown>

<div markdown>

### Cursor pagination

The exporter starts with an explicit half-open ledger range and follows each
RPC continuation cursor until the server has no more pages.

</div>

<div markdown>

### Stable snapshots

Events are deduplicated by ID. A completed export replaces its destination
atomically; a failed page leaves the prior file untouched.

</div>

<div markdown>

### No event schema assumptions

The original event objects are preserved as JSONL, including topic and value
representations supplied by Soroban RPC.

</div>

</div>

## Explore

<div class="docs-paths" markdown>

<div markdown>

### Export event ranges

Install the CLI, provide contract IDs and ledger bounds, and understand cursor
pagination and server retention.

[Quick start](guides/quickstart.md) ·
[Pagination and output](guides/pagination.md)

</div>

<div markdown>

### Integrate or contribute

Use the dependency-free `exportEvents` API or run the Node.js test suite.

[CLI and library](reference/api.md) ·
[Development](about/development.md)

</div>

</div>

## Install

Requires Node.js 20 or newer.

```sh
npm install
npm link
```

This project uses Node.js built-ins only and does not use React.
