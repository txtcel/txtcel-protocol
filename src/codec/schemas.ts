import { b } from '@zorsh/zorsh'
import { PublicKey } from '@solana/web3.js'
import { NEXT_ALLOC_INDEX } from '../constants/program'

export const Pubkey = b.bytes(32)

export function pubkeyToBase58(bytes: Uint8Array): string {
  return bytes.every(v => v === 0) ? '' : new PublicKey(bytes).toBase58()
}

export function formatTimestamp(value: bigint): string {
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)
  if (value > maxSafe || value < -maxSafe) return value.toString()
  return new Date(Number(value) * 1000).toISOString()
}

// ── Account schemas ──

// Mirrors the on-chain `ContentNode` (header fields are serialized inline by
// Borsh). `kind` is the message-type discriminator and `body` is the opaque,
// type-specific payload (UTF-8 text for `kind === KIND_TEXT`).
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

export const AllocNodeSchema = b.struct({
  tag: b.u8(),
  thread: Pubkey,
  allocSeq: b.u32(),
  upperAllocSeq: b.u32(),
  nextAllocSeq: b.u32(),
})

export const ThreadNodeSchema = b.struct({
  tag: b.u8(),
  allocCount: b.u32(),
  lastAllocSeq: b.u32(),
  author: Pubkey,
  messageFee: b.u64(),
  likeFee: b.u64(),
  title: b.bytes(),
})

export const ProgramSettingsSchema = b.struct({
  tag: b.u8(),
  admin: Pubkey,
  treasury: Pubkey,
  baseFeeBps: b.u32(),
  authorFeeCutBps: b.u32(),
  entryCutBps: b.u32(),
  likeCutBps: b.u32(),
})

export const ThreadAccessSchema = b.struct({
  tag: b.u8(),
  thread: Pubkey,
  enabled: b.u8(),
  admin: Pubkey,
  entryFee: b.u64(),
  whitelistCount: b.u32(),
})

export const AccessEntrySchema = b.struct({
  tag: b.u8(),
  thread: Pubkey,
  wallet: Pubkey,
  status: b.u8(),
})

export const AllocLikesSchema = b.struct({
  tag: b.u8(),
  allocSeq: b.u32(),
  counts: b.array(b.u32(), NEXT_ALLOC_INDEX),
})

// ── Instruction data schemas ──

export const CandidateSlotSchema = b.struct({
  allocSeq: b.u32(),
  slot: b.u8(),
})

export const TagOnlyInstr = b.struct({ tag: b.u8() })

export const SweepTreasuryInstr = b.struct({ tag: b.u8(), shardIndices: b.vec(b.u16()) })

export const SweepAuthorFeesInstr = b.struct({ tag: b.u8(), shardIndices: b.vec(b.u8()) })

export const FeeBpsInstr = b.struct({ tag: b.u8(), feeBps: b.u32() })

export const FeeU64Instr = b.struct({ tag: b.u8(), fee: b.u64() })

export const WalletArgInstr = b.struct({ tag: b.u8(), wallet: Pubkey })

export const TreasuryArgInstr = b.struct({ tag: b.u8(), treasury: Pubkey })

export const SetThreadAccessInstr = b.struct({ tag: b.u8(), enabled: b.u8() })

export const CreateRootAllocInstr = b.struct({
  tag: b.u8(),
  messageFee: b.u64(),
  treasuryShardIdx: b.u16(),
  title: b.bytes(),
})

export const FillSlotInstr = b.struct({
  tag: b.u8(),
  kind: b.u16(),
  body: b.bytes(),
  candidates: b.vec(CandidateSlotSchema),
  extend: b.u8(),
  treasuryShardIdx: b.u16(),
  authorFeeShardIdx: b.u8(),
  replyAllocSeq: b.u32(),
  replySlot: b.u8(),
  maxFee: b.u64(),
})

export const PrepareAllocInstr = b.struct({
  tag: b.u8(),
  allocSeq: b.u32(),
})

export const InitThreadAccessInstr = b.struct({
  tag: b.u8(),
  enabled: b.u8(),
  treasuryShardIdx: b.u16(),
})

export const RequestAccessInstr = b.struct({
  tag: b.u8(),
  treasuryShardIdx: b.u16(),
  authorFeeShardIdx: b.u8(),
})

export const LikeContentInstr = b.struct({
  tag: b.u8(),
  allocSeq: b.u32(),
  slot: b.u8(),
  treasuryShardIdx: b.u16(),
  authorFeeShardIdx: b.u8(),
  maxFee: b.u64(),
})

export const AppendContentInstr = b.struct({
  tag: b.u8(),
  chunk: b.bytes(),
  treasuryShardIdx: b.u16(),
  authorFeeShardIdx: b.u8(),
})
