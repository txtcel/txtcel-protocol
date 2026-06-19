import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { TagOnlyInstr } from '../codec/schemas'

export function buildCloseAccountInstruction(
  programId: PublicKey,
  payer: PublicKey,
  targetAccount: PublicKey,
  // Optional AllocLikes PDA for the content's alloc. Passing it lets the
  // program reset the freed slot's like counter so a message later reusing the
  // slot does not inherit the deleted message's likes.
  likesAccount?: PublicKey,
) {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: targetAccount, isSigner: false, isWritable: true },
  ]

  if (likesAccount) {
    keys.push({ pubkey: likesAccount, isSigner: false, isWritable: true })
  }

  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(TagOnlyInstr.serialize({ tag: Instruction.CloseAccount })),
  })
}
