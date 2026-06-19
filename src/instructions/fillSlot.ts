import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { INDEX_NONE, Instruction, KIND_TEXT } from '../constants/program'
import { FillSlotInstr } from '../codec/schemas'
import { deriveAccessEntryPda, deriveAccessPda, deriveAuthorFeePda, deriveSettingsPda, deriveThreadPda, deriveTreasuryShardPda } from './pda'

export function buildFillSlotInstruction(opts: {
  programId: PublicKey
  payer: PublicKey
  seed: Uint8Array
  candidates: Array<{ allocSeq: number; slot: number; pda: PublicKey }>
  treasuryShardIdx: number
  authorFeeShardIdx: number
  /** Opaque message payload. For the default text kind this is UTF-8 bytes. */
  bodyBytes: Uint8Array
  /** Message-type discriminator; defaults to plain text. */
  kind?: number
  maxFee: bigint
  extendInfo?: { currentAllocPda: PublicKey; newAllocPda: PublicKey }
  replyAllocSeq?: number | null
  replySlot?: number | null
}) {
  const {
    programId, payer, seed, candidates,
    treasuryShardIdx, authorFeeShardIdx,
    bodyBytes, kind = KIND_TEXT, maxFee, extendInfo,
    replyAllocSeq: replyAllocSeqRaw, replySlot: replySlotRaw,
  } = opts

  const threadAccount = deriveThreadPda(programId, seed)
  const settingsAccount = deriveSettingsPda(programId)
  const treasuryShard = deriveTreasuryShardPda(programId, treasuryShardIdx)
  const authorFeeShard = deriveAuthorFeePda(programId, seed, authorFeeShardIdx)
  // Access control is enforced on-chain via these two PDAs. The thread access
  // PDA carries the `enabled` flag; the per-wallet entry PDA carries the
  // allow/deny status for the payer. Both are mandatory and derived by the
  // program, so they cannot be omitted to bypass gating.
  const accessAccount = deriveAccessPda(programId, seed)
  const entryAccount = deriveAccessEntryPda(programId, seed, payer)

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: threadAccount, isSigner: false, isWritable: !!extendInfo },
    { pubkey: settingsAccount, isSigner: false, isWritable: false },
    { pubkey: treasuryShard, isSigner: false, isWritable: true },
    { pubkey: authorFeeShard, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  for (const c of candidates) {
    keys.push({ pubkey: c.pda, isSigner: false, isWritable: true })
  }

  keys.push({ pubkey: accessAccount, isSigner: false, isWritable: false })
  keys.push({ pubkey: entryAccount, isSigner: false, isWritable: false })

  if (extendInfo) {
    keys.push({ pubkey: extendInfo.currentAllocPda, isSigner: false, isWritable: true })
    keys.push({ pubkey: extendInfo.newAllocPda, isSigner: false, isWritable: true })
  }

  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(FillSlotInstr.serialize({
      tag: Instruction.FillSlot,
      kind,
      body: bodyBytes,
      candidates: candidates.map(c => ({ allocSeq: c.allocSeq, slot: c.slot })),
      extend: extendInfo ? 1 : 0,
      treasuryShardIdx,
      authorFeeShardIdx,
      replyAllocSeq: replyAllocSeqRaw ?? INDEX_NONE,
      replySlot: replySlotRaw ?? 0,
      maxFee,
    })),
  })
}
