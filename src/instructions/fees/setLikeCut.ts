import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { FeeBpsInstr } from '../../codec/schemas'
import { deriveSettingsPda } from '../pda'
import { signerMeta, writableMeta } from '../meta'

/**
 * Builds a `SetLikeCut` instruction that updates the platform's cut of like
 * fees (in basis points). Admin-only; rejected on-chain with `InvalidFeeBps`
 * above `MAX_FEE_CUT_BPS`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The current admin; signs the change.
 * @param feeBps - The new like-fee cut in basis points.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSetLikeCutInstruction(
  programId: PublicKey,
  authority: PublicKey,
  feeBps: number,
) {
  const settingsAccount = deriveSettingsPda(programId)
  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(authority),
      writableMeta(settingsAccount),
    ],
    data: Buffer.from(FeeBpsInstr.serialize({ tag: Instruction.SetLikeCut, feeBps })),
  })
}
