import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { FeeBpsInstr } from '../codec/schemas'
import { deriveSettingsPda } from './pda'

export type FeeKind = 'base' | 'authorCut' | 'entryCut' | 'likeCut'

const FEE_TAG: Record<FeeKind, number> = {
  base: Instruction.SetBaseFee,
  authorCut: Instruction.SetAuthorFeeCut,
  entryCut: Instruction.SetEntryCut,
  likeCut: Instruction.SetLikeCut,
}

/**
 * Convenience builder dispatching to one of the four platform-fee setters
 * (base / author cut / entry cut / like cut). Account layout matches the
 * on-chain `process_set_*` handlers: `[admin (signer), settings]`.
 */
export function buildSetFeeInstruction(
  programId: PublicKey,
  authority: PublicKey,
  kind: FeeKind,
  feeBps: number,
): TransactionInstruction {
  const settingsAccount = deriveSettingsPda(programId)
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: settingsAccount, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(FeeBpsInstr.serialize({ tag: FEE_TAG[kind], feeBps })),
  })
}
