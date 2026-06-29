import { b } from '@zorsh/zorsh'
import { PublicKey } from '@solana/web3.js'
import { CONTENT_SLOTS } from '../constants/program'

/** Zorsh schema for a 32-byte public key field. */
export const Pubkey = b.bytes(32)

/**
 * Converts raw 32-byte pubkey bytes to a base58 string, mapping the all-zero
 * key (the program's "unset" sentinel) to an empty string.
 *
 * @param bytes - The 32 raw pubkey bytes.
 * @returns The base58 address, or `''` when all bytes are zero.
 */
export function pubkeyToBase58(bytes: Uint8Array): string {
  return bytes.every(v => v === 0) ? '' : new PublicKey(bytes).toBase58()
}

/**
 * Formats an on-chain unix timestamp (`i64` seconds) as an ISO-8601 string.
 * Values outside the safe-integer range are returned as their decimal string to
 * avoid precision loss.
 *
 * @param value - The unix timestamp in seconds.
 * @returns The ISO-8601 timestamp, or the raw decimal string when out of range.
 */
export function formatTimestamp(value: bigint): string {
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)
  if (value > maxSafe || value < -maxSafe) return value.toString()
  return new Date(Number(value) * 1000).toISOString()
}

// ── Account schemas ──

/**
 * Mirrors the on-chain `ContentNode` (header fields are serialized inline by
 * Borsh). `kind` is the message-type discriminator and `body` is the opaque,
 * type-specific payload (UTF-8 text for `kind === KIND_TEXT`).
 */
export const ContentNodeSchema = b.struct({
  tag: b.u8(),
  allocSeq: b.u32(),
  slot: b.u8(),
  thread: Pubkey,
  author: Pubkey,
  createdAt: b.i64(),
  replyAllocSeq: b.u32(),
  replySlot: b.u8(),
  kind: b.u16(),
  body: b.bytes(),
})

/** Mirrors the on-chain `AllocNode` (a page in a thread's alloc chain). */
export const AllocNodeSchema = b.struct({
  tag: b.u8(),
  thread: Pubkey,
  allocSeq: b.u32(),
})

/** Mirrors the on-chain `ThreadNode` (channel header + fees + title). */
export const ThreadNodeSchema = b.struct({
  tag: b.u8(),
  allocCount: b.u32(),
  lastAllocSeq: b.u32(),
  author: Pubkey,
  messageFee: b.u64(),
  likeFee: b.u64(),
  title: b.bytes(),
})

/** Mirrors the on-chain `ProgramSettings` (admin, treasury, fee cuts). */
export const ProgramSettingsSchema = b.struct({
  tag: b.u8(),
  admin: Pubkey,
  treasury: Pubkey,
  baseFeeBps: b.u32(),
  authorFeeCutBps: b.u32(),
  entryCutBps: b.u32(),
  likeCutBps: b.u32(),
})

/** Mirrors the on-chain `ThreadAccess` (per-channel gating config). */
export const ThreadAccessSchema = b.struct({
  tag: b.u8(),
  thread: Pubkey,
  enabled: b.u8(),
  admin: Pubkey,
  entryFee: b.u64(),
  whitelistCount: b.u32(),
})

/** Mirrors the on-chain per-wallet `AccessEntry` membership record. */
export const AccessEntrySchema = b.struct({
  tag: b.u8(),
  thread: Pubkey,
  wallet: Pubkey,
  status: b.u8(),
})

/** Mirrors the on-chain `AllocLikes` (per-slot like counters for one alloc). */
export const AllocLikesSchema = b.struct({
  tag: b.u8(),
  allocSeq: b.u32(),
  counts: b.array(b.u32(), CONTENT_SLOTS),
})

/** Mirrors the on-chain `FollowRegistry` (a wallet's followed channels). */
export const FollowRegistrySchema = b.struct({
  tag: b.u8(),
  owner: Pubkey,
  channels: b.vec(Pubkey),
})

/** Mirrors the on-chain `FollowerShard` (one shard of a channel's counter). */
export const FollowerShardSchema = b.struct({
  tag: b.u8(),
  thread: Pubkey,
  shard: b.u8(),
  count: b.u64(),
})

// ── Instruction data schemas ──

/** A single `(allocSeq, slot)` fill candidate, as carried in `FillSlot` data. */
export const CandidateSlotSchema = b.struct({
  allocSeq: b.u32(),
  slot: b.u8(),
})

/** Instruction data for variants that carry only their tag (no arguments). */
export const TagOnlyInstr = b.struct({ tag: b.u8() })

/** `SweepTreasury` data: the `u16` treasury shard indices to drain. */
export const SweepTreasuryInstr = b.struct({ tag: b.u8(), shardIndices: b.vec(b.u16()) })

/** `SweepAuthorFees` data: the `u8` author-fee shard indices to drain. */
export const SweepAuthorFeesInstr = b.struct({ tag: b.u8(), shardIndices: b.vec(b.u8()) })

/** Data for the platform-fee setters: a fee value in basis points. */
export const FeeBpsInstr = b.struct({ tag: b.u8(), feeBps: b.u32() })

/** Data for the lamport-fee setters (message / like / entry fee). */
export const FeeU64Instr = b.struct({ tag: b.u8(), fee: b.u64() })

/** Data for instructions that take a single wallet argument (ACL, set-admin). */
export const WalletArgInstr = b.struct({ tag: b.u8(), wallet: Pubkey })

/** Data for instructions that take a single treasury wallet argument. */
export const TreasuryArgInstr = b.struct({ tag: b.u8(), treasury: Pubkey })

/** `SetThreadAccess` data: the new `enabled` flag. */
export const SetThreadAccessInstr = b.struct({ tag: b.u8(), enabled: b.u8() })

/** `CreateRootAlloc` data: message fee, treasury shard index and title bytes. */
export const CreateRootAllocInstr = b.struct({
  tag: b.u8(),
  messageFee: b.u64(),
  treasuryShardIdx: b.u16(),
  title: b.bytes(),
})

/** `FillSlot` data: message kind/body, fill candidates, shards, reply link and fee cap. */
export const FillSlotInstr = b.struct({
  tag: b.u8(),
  kind: b.u16(),
  body: b.bytes(),
  candidates: b.vec(CandidateSlotSchema),
  treasuryShardIdx: b.u16(),
  authorFeeShardIdx: b.u8(),
  replyAllocSeq: b.u32(),
  replySlot: b.u8(),
  maxFee: b.u64(),
})

/** `PrepareAlloc` data: the current alloc sequence to link a new page after. */
export const PrepareAllocInstr = b.struct({
  tag: b.u8(),
  allocSeq: b.u32(),
})

/** `InitThreadAccess` data: the initial `enabled` flag and treasury shard index. */
export const InitThreadAccessInstr = b.struct({
  tag: b.u8(),
  enabled: b.u8(),
  treasuryShardIdx: b.u16(),
})

/** `RequestAccess` data: the treasury and author-fee shard indices to credit. */
export const RequestAccessInstr = b.struct({
  tag: b.u8(),
  treasuryShardIdx: b.u16(),
  authorFeeShardIdx: b.u8(),
})

/** `LikeContent` data: target slot, shard indices and fee cap. */
export const LikeContentInstr = b.struct({
  tag: b.u8(),
  allocSeq: b.u32(),
  slot: b.u8(),
  treasuryShardIdx: b.u16(),
  authorFeeShardIdx: b.u8(),
  maxFee: b.u64(),
})

/** `AppendContent` data: the chunk bytes plus shard indices to credit. */
export const AppendContentInstr = b.struct({
  tag: b.u8(),
  chunk: b.bytes(),
  treasuryShardIdx: b.u16(),
  authorFeeShardIdx: b.u8(),
})
