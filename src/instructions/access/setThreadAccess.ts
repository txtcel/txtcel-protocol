import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { SetThreadAccessInstr } from '../../codec/schemas'
import { signerMeta, writableMeta } from '../meta'

/**
 * Builds a `SetThreadAccess` instruction that toggles a channel's gating on or
 * off. Thread-admin-only; the program verifies `authority` equals the access
 * account's admin.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread admin; signs the change.
 * @param accessAccount - The thread's `ThreadAccess` PDA.
 * @param enabled - Whether gating should be enabled.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSetThreadAccessInstruction(
  programId: PublicKey,
  authority: PublicKey,
  accessAccount: PublicKey,
  enabled: boolean,
) {
  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(authority),
      writableMeta(accessAccount),
    ],
    data: Buffer.from(SetThreadAccessInstr.serialize({
      tag: Instruction.SetThreadAccess,
      enabled: enabled ? 1 : 0,
    })),
  })
}
