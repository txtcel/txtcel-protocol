import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { TagOnlyInstr } from '../../codec/schemas'
import { signerMeta, writableMeta } from '../meta'

/**
 * Builds a `CloseAccount` instruction that closes a program-owned account and
 * refunds its rent to the payer.
 *
 * When closing a content account, optionally pass its alloc's `AllocLikes` PDA
 * so the program resets the freed slot's like counter; otherwise a message that
 * later reuses the slot would inherit the deleted message's likes.
 *
 * @param programId - The deployed Txtcel program address.
 * @param payer - Fee payer / rent recipient; must be authorized to close the target.
 * @param targetAccount - The account to close.
 * @param likesAccount - Optional `AllocLikes` PDA for the content's alloc; when
 *   provided, the program resets the freed slot's like counter.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildCloseAccountInstruction(
  programId: PublicKey,
  payer: PublicKey,
  targetAccount: PublicKey,
  likesAccount?: PublicKey,
) {
  const keys = [
    signerMeta(payer),
    writableMeta(targetAccount),
  ]

  if (likesAccount) {
    keys.push(writableMeta(likesAccount))
  }

  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(TagOnlyInstr.serialize({ tag: Instruction.CloseAccount })),
  })
}
