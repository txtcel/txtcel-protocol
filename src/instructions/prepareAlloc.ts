import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { PrepareAllocInstr } from '../codec/schemas'
import { deriveAllocPda, deriveThreadPda } from './pda'

export function buildPrepareAllocInstruction(
  programId: PublicKey,
  payer: PublicKey,
  seed: Uint8Array,
  allocSeq: number,
) {
  const currentAllocPda = deriveAllocPda(programId, seed, allocSeq)
  const newAllocPda = deriveAllocPda(programId, seed, allocSeq + 1)
  const threadAccount = deriveThreadPda(programId, seed)

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: currentAllocPda, isSigner: false, isWritable: true },
      { pubkey: newAllocPda, isSigner: false, isWritable: true },
      { pubkey: threadAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(PrepareAllocInstr.serialize({
      tag: Instruction.PrepareAlloc,
      allocSeq,
    })),
  })
}
