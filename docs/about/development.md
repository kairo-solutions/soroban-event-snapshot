# Development

## Requirements

- Node.js 20 or newer
- npm

## Test locally

```sh
npm test
```

Tests use local HTTP servers for Soroban RPC responses; they do not need a live
network. The CI workflow tests Node.js 20, 22, and 24.

## Contribution scope

Keep changes focused on reliable pagination, event preservation, or clear
failure behavior. Add tests for RPC edge cases and ensure failed exports do not
replace an existing destination.
