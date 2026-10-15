# Quick start

## Requirements and install

Install Node.js 20 or newer, then install the project from a checkout:

```sh
git clone https://github.com/kairo-solutions/soroban-event-snapshot.git
cd soroban-event-snapshot
npm install
```

There are no runtime npm dependencies.

## Export a range

```sh
node src/cli.js \
  --rpc-url https://soroban-testnet.stellar.org \
  --start-ledger 199616 \
  --end-ledger 199700 \
  --contract-id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --output events.jsonl
```

The start ledger is included and the end ledger is excluded. Supply between one
and five contract IDs by repeating `--contract-id`.

## Tune the export

```sh
node src/cli.js \
  --rpc-url https://soroban-testnet.stellar.org \
  --start-ledger 199616 \
  --end-ledger 199700 \
  --contract-id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --page-size 500 \
  --timeout-ms 15000 \
  --output events.jsonl
```

`--page-size` accepts 1 through 10,000. `--timeout-ms` sets the timeout for
each RPC request. Use `node src/cli.js --help` for all options.
