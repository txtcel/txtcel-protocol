import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { FeeBpsInstr } from '../../codec/schemas'
import { deriveSettingsPda } from '../pda'
import { signerMeta, writableMeta } from '../meta'

/**
 * Selects which platform fee {@link buildSetFeeInstruction} updates:
 * `'base'` (base fee), `'authorCut'` (author-fee cut), `'entryCut'`
 * (entry-fee cut) or `'likeCut'` (like-fee cut).
 */
export type FeeKind = 'base' | 'authorCut' | 'entryCut' | 'likeCut'

/** Maps each {@link FeeKind} to its on-chain instruction variant index. */
const FEE_TAG: Record<FeeKind, number> = {
  base: Instruction.SetBaseFee,
  authorCut: Instruction.SetAuthorFeeCut,
  entryCut: Instruction.SetEntryCut,
  likeCut: Instruction.SetLikeCut,
}

/**
 * Convenience builder dispatching to one of the four platform-fee setters
 * (base / author cut / entry cut / like cut).
 *
 * Account layout matches the on-chain `process_set_*` handlers:
 * `[admin (signer), settings]`. Admin-only; values are rejected on-chain with
 * `InvalidFeeBps` above `MAX_FEE_CUT_BPS`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The current admin; signs the change.
 * @param kind - Which platform fee to update (see {@link FeeKind}).
 * @param feeBps - The new fee in basis points.
 * @returns The assembled `TransactionInstruction`.
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
      signerMeta(authority),
      writableMeta(settingsAccount),
    ],
    data: Buffer.from(FeeBpsInstr.serialize({ tag: FEE_TAG[kind], feeBps })),
  })
}
