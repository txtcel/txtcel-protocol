import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { FeeU64Instr } from '../../codec/schemas'
import { signerMeta, writableMeta } from '../meta'

/**
 * Builds a `SetMessageFee` instruction that updates a channel's per-message
 * author fee. Thread-author-only; the program verifies `authority` equals the
 * thread's author.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread author; signs the change.
 * @param threadAccount - The thread account whose message fee is updated.
 * @param fee - The new per-message fee in lamports.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSetMessageFeeInstruction(
  programId: PublicKey,
  authority: PublicKey,
  threadAccount: PublicKey,
  fee: bigint,
) {
  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(authority),
      writableMeta(threadAccount),
    ],
    data: Buffer.from(FeeU64Instr.serialize({ tag: Instruction.SetMessageFee, fee })),
  })
}
