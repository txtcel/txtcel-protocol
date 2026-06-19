# @txtcel/protocol

TypeScript SDK for the [Txtcel](https://txtcel.com) Solana program — a thin,
framework-agnostic wrapper around the on-chain protocol. It gives you:

- **Instruction builders** — `build*Instruction(...)` for every program instruction.
- **PDA derivation** — `derive*Pda(...)` helpers that mirror the program's seeds.
- **Account codecs** — borsh/zorsh schemas to decode on-chain accounts.
- **Account loaders** — `load*` helpers that fetch + decode in one call.
- **Constants** — discriminator tags, seeds, instruction indices, layout sizes.

No React, no wallet adapter — just `@solana/web3.js` primitives, so it works in
the browser, in Node scripts and in tests.

## Install

```bash
npm install @txtcel/protocol @solana/web3.js
```

`@solana/web3.js` (v1) is a **peer dependency** — install it in your app.

## Usage

```ts
import { Connection, PublicKey } from '@solana/web3.js'
import {
  deriveSettingsPda,
  loadProgramSettings,
  buildSendMessageTransactions,
} from '@txtcel/protocol'

const connection = new Connection('https://api.mainnet-beta.solana.com')
const programId = new PublicKey('<YOUR_PROGRAM_ID>')

// Derive a PDA
const settingsPda = deriveSettingsPda(programId)

// Load + decode an account in one call
const settings = await loadProgramSettings(connection, programId)

// Build instruction(s) for a higher-level action
const txs = await buildSendMessageTransactions(/* ...args */)
```

All builders take the `programId` explicitly — the SDK has no hard-coded address,
so the same package works across clusters and deployments.

## Build

```bash
npm install
npm run build      # tsup -> dist (ESM + CJS + .d.ts)
npm run typecheck
```

## Publishing

```bash
npm run build
npm publish        # publishConfig.access is already "public"
```

## License

[MIT](./LICENSE)
