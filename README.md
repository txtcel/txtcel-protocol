# @txtcel/protocol

TypeScript SDK for the [Txtcel](https://txtcel.com) Solana program — a thin,
framework-agnostic wrapper around the on-chain protocol. It gives you:

- **Instruction builders** — `build*Instruction(...)` for every program instruction.
- **High-level helpers** — `buildSendMessageTransactions`, `createRootAlloc`, …
- **PDA derivation** — `derive*Pda(...)` helpers that mirror the program's seeds.
- **Account codecs** — borsh/zorsh schemas to decode on-chain accounts.
- **Account loaders** — `load*` helpers that fetch + decode in one call.
- **Constants & types** — discriminator tags, seeds, instruction indices, layout sizes.

No React, no wallet adapter — just `@solana/web3.js` primitives, so it works in
the browser, in Node scripts and in tests.

> **Note:** This README is LLM-generated from the source and reviewed by hand.
> The code is the source of truth. A condensed, agent-oriented overview lives in
> [`llms.txt`](./llms.txt).

## Install

```bash
npm install @txtcel/protocol @solana/web3.js
```

`@solana/web3.js` (v1) is a **peer dependency** — install it in your app.

## Quick start

```ts
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import {
  createRootAlloc,
  buildSendMessageTransactions,
  loadThreadNode,
} from '@txtcel/protocol'

const connection = new Connection('https://api.mainnet-beta.solana.com')
const programId = '<YOUR_PROGRAM_ID>'
const payer = Keypair.generate()

// 1. Create a channel (thread). `seed` is the thread's 32-byte identity.
const { seed, threadPda } = await createRootAlloc(connection, programId, payer)

// 2. Post a message (auto-chunks if it exceeds one transaction).
const txs = await buildSendMessageTransactions(
  connection, new PublicKey(programId), payer.publicKey, seed, 'gm world',
)

// 3. Read the thread back.
const thread = await loadThreadNode(connection, new PublicKey(programId), new PublicKey(threadPda))
```

All builders take the `programId` explicitly — the SDK has no hard-coded address,
so the same package works across clusters and deployments.

> **`seed`** — most functions take a `seed: Uint8Array`. This is the thread's
> 32-byte identity (the thread account's pubkey bytes). `createRootAlloc` returns
> it; for an existing thread it's `new PublicKey(threadPda).toBytes()`. Child PDAs
> (alloc/content/access/likes/author-fee) all derive from it.

---

## API reference

Everything is re-exported from the package root (`src/index.ts`).

### High-level messaging helpers

#### `createRootAlloc(connection, programId, payer, messageFee?, title?, onSent?)`

Creates a new thread (channel) + root alloc and confirms it with a local
`Keypair` payer. Generates a fresh thread keypair internally (it co-signs).

- `programId: string`, `payer: Keypair`
- `messageFee: bigint = 0n` — per-message author fee in lamports.
- `title: string = ''` — channel title (≤ `MAX_TITLE_LEN` bytes).
- `onSent?: () => void` — called right after the tx is submitted.
- **Returns** `{ signature, seed, threadPda, allocPda }`.

#### `createRootAllocWithWallet(connection, programId, wallet, messageFee?, title?, onSent?)`

Same as above but for a wallet-adapter style signer
(`WalletSigner = { publicKey, signTransaction }`). The wallet is fee payer; the
generated thread keypair is an extra signer.

#### `buildSendMessageTransactions(connection, programId, payerKey, seed, text, replyTo?)`

The recommended way to post a message. Returns an **array** of POST-ONLY
`Transaction`s: the first is a `FillSlot`, followed by `AppendContent` txs when
`text` is larger than one transaction. It never co-bundles `prepare_alloc`
(growing the chain is the separate `buildExtendAllocTransaction`). It:

- loads the thread (`N = thread.lastAllocSeq`),
- gathers free content slots from a **rolling 2-page window** — the previous
  page `N-1` (when it exists) plus the tail page `N` — in one
  `getMultipleAccountsInfo`,
- shuffles that pool and picks up to `DESIRED_CANDIDATES = 3` to reduce write
  contention,
- computes a `maxFee` slippage cap (≈ 2× base fee + message fee),
- picks random treasury/author-fee shards.

Liveness fallback: if the whole 2-page window is full (rare burst), it
co-bundles `prepare_alloc(N)` before a `fill_slot` targeting page `N+1`, so a
post is always possible. `replyTo?: { allocSeq: number; slot: number } | null`
threads the message as a reply. Throws `'Text must not be empty'` /
`'Body is too long'`.

#### `buildExtendAllocTransaction(connection, programId, payerKey, seed)`

Returns a **best-effort** `prepare_alloc(N)` transaction that grows the alloc
chain when the tail page `N = thread.lastAllocSeq` has `filled >=
EXTEND_THRESHOLD` slots, else `null`. Decoupled from posting: fire it alongside
a post and **ignore its failure** (e.g. `InvalidAllocSeq` when another sender
already extended).

#### `sendMessageWithWallet(connection, programId, wallet, seed, text, replyTo?, onSent?)`

Posts a message with a wallet using a **single approval**: builds the post txs
plus the best-effort extend tx, signs them all in one `signAllTransactions`
call (falling back to per-tx `signTransaction`), then sends them as independent
transactions — `fill_slot` then `append_content` chunks (confirmed), and the
extend tx best-effort (its failure is swallowed). Returns
`{ signatures, extendSignature }`.

#### `buildSendMessageTransaction(...)` — *deprecated*

Returns only the first transaction. Use `buildSendMessageTransactions` for
chunked sending.

#### `type WalletSigner`

`{ publicKey: PublicKey; signTransaction: (tx) => Promise<Transaction>; signAllTransactions?: (txs) => Promise<Transaction[]> }`

---

### Instruction builders

Each returns a `TransactionInstruction` you add to your own `Transaction`. They
mirror the on-chain instructions 1:1 (see the program README for account
semantics, fees and errors).

| Builder | On-chain instruction | Key args |
|---------|----------------------|----------|
| `buildCreateRootAllocInstruction(programId, payer, seed, messageFee?, title?)` | `CreateRootAlloc` | thread keypair pubkey as `seed`, picks a random treasury shard. |
| `buildFillSlotInstruction(opts)` | `FillSlot` | see options below. |
| `buildPrepareAllocInstruction(programId, payer, seed, allocSeq)` | `PrepareAlloc` | pre-creates `allocSeq + 1`. |
| `buildAppendContentInstruction(programId, payer, contentAccount, threadAccount, settingsAccount, treasuryShard, authorFeeShard, chunk, treasuryShardIdx, authorFeeShardIdx)` | `AppendContent` | append bytes to your message. |
| `buildLikeContentInstruction(programId, payer, seed, allocSeq, slot, maxFee)` | `LikeContent` | random shards chosen internally. |
| `buildCloseAccountInstruction(programId, payer, targetAccount, likesAccount?)` | `CloseAccount` | optional likes account resets the slot counter. |
| `buildSweepTreasuryInstruction(programId, treasuryWallet, shardIndices)` | `SweepTreasury` | `[settings, treasury, ...shards]`. |
| `buildSweepAuthorFeesInstruction(programId, seed, threadAccount, authorWallet, shardIndices)` | `SweepAuthorFees` | author signs. |
| `buildInitSettingsInstruction(programId, authority, treasury)` | `InitSettings` | derives ProgramData PDA; upgrade authority signs. |
| `buildSetTreasuryInstruction(programId, authority, treasury)` | `SetTreasury` | admin only. |
| `buildSetAdminInstruction(programId, authority, newAdmin)` | `SetAdmin` | admin only. |
| `buildSetFeeInstruction(programId, authority, kind, feeBps)` | `SetBaseFee`/`SetAuthorFeeCut`/`SetEntryCut`/`SetLikeCut` | `kind: FeeKind`. |
| `buildSetBaseFeeInstruction(programId, authority, feeBps)` | `SetBaseFee` | admin only. |
| `buildSetAuthorFeeCutInstruction(programId, authority, feeBps)` | `SetAuthorFeeCut` | admin only. |
| `buildSetEntryCutInstruction(programId, authority, feeBps)` | `SetEntryCut` | admin only. |
| `buildSetLikeCutInstruction(programId, authority, feeBps)` | `SetLikeCut` | admin only. |
| `buildSetMessageFeeInstruction(programId, authority, threadAccount, fee)` | `SetMessageFee` | thread author. |
| `buildSetLikeFeeInstruction(programId, authority, threadAccount, fee)` | `SetLikeFee` | thread author. |
| `buildSetEntryFeeInstruction(programId, authority, accessAccount, fee)` | `SetEntryFee` | thread admin. |
| `buildInitThreadAccessInstruction(programId, authority, seed, enabled)` | `InitThreadAccess` | thread author. |
| `buildSetThreadAccessInstruction(programId, authority, accessAccount, enabled)` | `SetThreadAccess` | thread admin. |
| `buildAddToWhitelistInstruction(programId, authority, seed, wallet)` | `AddToWhitelist` | thread admin. |
| `buildRemoveFromWhitelistInstruction(programId, authority, seed, wallet)` | `RemoveFromWhitelist` | thread admin. |
| `buildAddToBlacklistInstruction(programId, authority, seed, wallet)` | `AddToBlacklist` | thread admin. |
| `buildRemoveFromBlacklistInstruction(programId, authority, seed, wallet)` | `RemoveFromBlacklist` | thread admin. |
| `buildAddToFeeWhitelistInstruction(programId, authority, seed, wallet)` | `AddToFeeWhitelist` | thread admin. |
| `buildRemoveFromFeeWhitelistInstruction(programId, authority, seed, wallet)` | `RemoveFromFeeWhitelist` | thread admin. |
| `buildRequestAccessInstruction(programId, payer, seed)` | `RequestAccess` | pay entry fee to join. |
| `buildSubscribeInstruction({ programId, user, seed })` | `Subscribe` | follow a channel; no fee, user pays registry/shard rent. |
| `buildUnsubscribeInstruction({ programId, user, seed })` | `Unsubscribe` | unfollow a channel; refunds freed registry rent. |

#### `buildFillSlotInstruction(opts)` options

```ts
{
  programId: PublicKey
  payer: PublicKey
  seed: Uint8Array
  candidates: Array<{ allocSeq: number; slot: number; pda: PublicKey }>
  treasuryShardIdx: number
  authorFeeShardIdx: number
  bodyBytes: Uint8Array          // opaque payload; UTF-8 for the default text kind
  kind?: number                  // message-type discriminator, defaults to KIND_TEXT
  maxFee: bigint                 // slippage cap on base + author fee
  replyAllocSeq?: number | null
  replySlot?: number | null
}
```

The builder appends the mandatory `access` + per-wallet `entry` PDAs (derived
for `payer`) at fixed positions. `fill_slot` is element-only and never grows the
alloc chain — linking a new page is the separate `prepare_alloc` instruction.

#### `type FeeKind`

`'base' | 'authorCut' | 'entryCut' | 'likeCut'` — selects which platform fee
`buildSetFeeInstruction` updates.

---

### PDA derivation

All mirror the program's seeds exactly (see the program README PDA table).

| Function | Returns |
|----------|---------|
| `deriveSettingsPda(programId)` | global settings PDA. |
| `deriveThreadPda(programId, seed)` | the thread account address (= `new PublicKey(seed)`; thread is a full-address account, not a PDA). |
| `deriveAllocPda(programId, seed, allocSeq)` | alloc node PDA. |
| `deriveContentPda(programId, seed, allocSeq, slot)` | content (message) PDA. |
| `deriveAccessPda(programId, seed)` | `ThreadAccess` PDA. |
| `deriveAccessEntryPda(programId, seed, wallet)` | per-wallet `AccessEntry` PDA. |
| `deriveLikesPda(programId, seed, allocSeq)` | `AllocLikes` PDA. |
| `deriveTreasuryShardPda(programId, shard)` | treasury vault shard PDA. |
| `deriveAuthorFeePda(programId, seed, shard)` | author-fee vault shard PDA. |
| `deriveProgramDataPda(programId)` | BPF loader ProgramData account (holds upgrade authority). |
| `deriveFollowRegistryPda(programId, owner)` | per-wallet `FollowRegistry` PDA. |
| `deriveFollowerShardPda(programId, seed, shard)` | per-channel `FollowerShard` counter PDA. |
| `followerShardIndex(owner)` | shard index for a wallet (`owner.toBytes()[0] % N_FOLLOWER_SHARDS`). |
| `randomTreasuryShard()` | random index in `[0, N_TREASURY_SHARDS)`. |
| `randomAuthorFeeShard()` | random index in `[0, N_AUTHOR_FEE_SHARDS)`. |

Helper seed encoders `u16Seed(n)` / `u32Seed(n)` are also exported.

---

### Account loaders

Fetch (`getAccountInfo`, `'confirmed'`) + validate owner/tag + decode in one
call.

| Loader | Returns | Missing account |
|--------|---------|-----------------|
| `loadThreadNode(connection, programId, pubkey)` | `ThreadNodeData` | throws. |
| `loadAllocNode(connection, programId, pubkey)` | `AllocNodeData` | throws. |
| `loadContentNode(connection, programId, pubkey)` | `ContentNodeData` | throws. |
| `loadProgramSettings(connection, programId)` | `ProgramSettingsData \| null` | returns `null`. |
| `loadThreadAccess(connection, programId, accessKey)` | `ThreadAccessData` | throws. |
| `loadAllocLikes(connection, programId, pubkey)` | `AllocLikesData \| null` | returns `null`. |
| `loadAccessEntries(connection, programId, seed)` | `{ whitelist, blacklist, feeExempt }` of base58 strings | scans program accounts by tag + seed. |
| `loadFollowRegistry(connection, programId, owner)` | `FollowRegistryData \| null` | returns `null`. |
| `loadFollowerCount(connection, programId, seed)` | `bigint` (sum of all follower shards) | returns `0n`. |

---

### Account codecs

Pure decoders (`Uint8Array -> typed data`), used by the loaders but exported for
when you already have raw account data (e.g. from `getProgramAccounts` or a
websocket subscription).

- `decodeContent(pubkey, data) → ContentNodeData`
- `decodeAlloc(pubkey, data) → AllocNodeData`
- `decodeThread(pubkey, data) → ThreadNodeData`
- `decodeSettings(pubkey, data) → ProgramSettingsData`
- `decodeThreadAccess(pubkey, data) → ThreadAccessData`
- `decodeAccessEntry(pubkey, data) → AccessEntryData`
- `decodeAllocLikes(pubkey, data) → AllocLikesData`
- `decodeFollowRegistry(pubkey, data) → FollowRegistryData`
- `decodeFollowerShard(pubkey, data) → FollowerShardData`

The raw zorsh schemas (`ContentNodeSchema`, `FillSlotInstr`, …) live in
`codec/schemas.ts` if you need to (de)serialize manually.

---

### Types

```ts
type ContentNodeData = {
  pubkey: string
  allocSeq: number
  slot: number
  seed: Uint8Array          // owning thread's identity bytes
  author: string
  createdAt: string         // ISO-8601
  replyAllocSeq: number | null
  replySlot: number | null
  contentKind: number       // KIND_* discriminator
  body: Uint8Array          // opaque, raw bytes
  text: string              // decoded UTF-8 when contentKind === KIND_TEXT
}

type AllocNodeData = {
  pubkey: string; seed: Uint8Array; allocSeq: number
}

type ThreadNodeData = {
  pubkey: string; seed: Uint8Array; allocCount: number; lastAllocSeq: number
  author: string; messageFee: bigint; likeFee: bigint; title: string
}

type ProgramSettingsData = {
  pubkey: string; admin: string; treasury: string
  baseFeeBps: number; authorFeeCutBps: number; entryCutBps: number; likeCutBps: number
}

type ThreadAccessData = {
  pubkey: string; seed: Uint8Array; enabled: boolean; admin: string
  entryFee: bigint; whitelistCount: number
}

type AccessEntryData = { pubkey: string; seed: Uint8Array; wallet: string; status: number }

type AllocLikesData = { pubkey: string; allocSeq: number; counts: number[] }
```

---

### Constants

| Group | Constants |
|-------|-----------|
| Account tags | `TAG_CONTENT`, `TAG_ALLOC`, `TAG_THREAD`, `TAG_SETTINGS`, `TAG_ACCESS`, `TAG_LIKES`, `TAG_ACCESS_ENTRY`, `TAG_FOLLOW_REGISTRY`, `TAG_FOLLOWER_SHARD` |
| Content kinds | `KIND_TEXT` |
| Access status | `ACCESS_ALLOWED`, `ACCESS_DENIED`, `ACCESS_FEE_EXEMPT` |
| Layout sizes | `CONTENT_SLOTS`, `EXTEND_THRESHOLD`, `MAX_BODY_LEN`, `MAX_TITLE_LEN`, `INDEX_NONE`, `PUBKEY_SIZE` |
| Shards / follows | `N_TREASURY_SHARDS`, `N_AUTHOR_FEE_SHARDS`, `N_FOLLOWER_SHARDS`, `MAX_FOLLOWS` |
| Fees | `MAX_FEE_CUT_BPS` (5000; on-chain max for fee cuts / base fee) |
| Seeds | `SEED_SETTINGS`, `SEED_ALLOC`, `SEED_CONTENT`, `SEED_ACCESS`, `SEED_LIKES`, `SEED_TREASURY_SHARD`, `SEED_AUTHOR_FEE`, `SEED_ACL`, `SEED_FOLLOWS`, `SEED_FOLLOWER_COUNT` |
| Misc | `Instruction` (variant index map), `BPF_LOADER_UPGRADEABLE_ID`, `DESIRED_CANDIDATES`, `BPS_DIVISOR`, `TX_POLL_TIMEOUT_MS`, `TX_POLL_INTERVAL_MS` |

The `Instruction` object maps instruction names to their on-chain variant index
(e.g. `Instruction.FillSlot === 1`), matching `ProgramInstruction` in the
program's `instruction.rs`.

---

## Recipes

### Post a message and send it

```ts
import { Connection, PublicKey } from '@solana/web3.js'
import { buildSendMessageTransactions } from '@txtcel/protocol'

const txs = await buildSendMessageTransactions(
  connection, programId, wallet.publicKey, seed, longText,
)
for (const tx of txs) {
  tx.feePayer = wallet.publicKey
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  const signed = await wallet.signTransaction(tx)
  await connection.sendRawTransaction(signed.serialize())
}
```

### Gate a thread, then whitelist a wallet

```ts
import { Transaction } from '@solana/web3.js'
import {
  buildInitThreadAccessInstruction,
  buildAddToWhitelistInstruction,
} from '@txtcel/protocol'

const tx = new Transaction()
  .add(buildInitThreadAccessInstruction(programId, author, seed, true))
  .add(buildAddToWhitelistInstruction(programId, author, seed, memberWallet))
```

### Sweep platform revenue

```ts
import { buildSweepTreasuryInstruction } from '@txtcel/protocol'

const ix = buildSweepTreasuryInstruction(programId, treasuryWallet, [0, 1, 2])
```

---

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
