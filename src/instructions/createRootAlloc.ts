import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { CreateRootAllocInstr } from '../codec/schemas'
import { deriveAllocPda, deriveSettingsPda, deriveThreadPda, deriveTreasuryShardPda, randomTreasuryShard } from './pda'

export function buildCreateRootAllocInstruction(
  programId: PublicKey,
  payer: PublicKey,
  seed: Uint8Array,
  messageFee: bigint = 0n,
  title: string = '',
) {
  const titleBytes = new TextEncoder().encode(title)
  // The thread account is a fresh keypair whose pubkey is the channel identity
  // (`seed` == its 32 address bytes). It signs its own creation, so there is no
  // global counter and channel creation has no shared writable account.
  const threadAccount = deriveThreadPda(programId, seed)
  const allocAccount = deriveAllocPda(programId, seed, 0)
  const settingsAccount = deriveSettingsPda(programId)
  const treasuryShardIdx = randomTreasuryShard()
  const treasuryShard = deriveTreasuryShardPda(programId, treasuryShardIdx)

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: threadAccount, isSigner: true, isWritable: true },
      { pubkey: allocAccount, isSigner: false, isWritable: true },
      { pubkey: settingsAccount, isSigner: false, isWritable: false },
      { pubkey: treasuryShard, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(CreateRootAllocInstr.serialize({
      tag: Instruction.CreateRootAlloc,
      messageFee,
      treasuryShardIdx,
      title: titleBytes,
    })),
  })
}
