import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { SweepAuthorFeesInstr } from '../codec/schemas'
import { deriveAuthorFeePda } from './pda'

export function buildSweepAuthorFeesInstruction(
  programId: PublicKey,
  seed: Uint8Array,
  threadAccount: PublicKey,
  authorWallet: PublicKey,
  shardIndices: number[],
) {
  const keys = [
    { pubkey: threadAccount, isSigner: false, isWritable: false },
    { pubkey: authorWallet, isSigner: true, isWritable: true },
  ]

  for (const idx of shardIndices) {
    keys.push({
      pubkey: deriveAuthorFeePda(programId, seed, idx),
      isSigner: false,
      isWritable: true,
    })
  }

  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(SweepAuthorFeesInstr.serialize({
      tag: Instruction.SweepAuthorFees,
      shardIndices: Uint8Array.from(shardIndices),
    })),
  })
}
