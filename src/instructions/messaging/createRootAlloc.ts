import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction, MAX_TITLE_LEN } from '../../constants/program'
import { CreateRootAllocInstr } from '../../codec/schemas'
import { deriveAllocPda, deriveSettingsPda, deriveThreadPda, deriveTreasuryShardPda, randomTreasuryShard } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Builds a `CreateRootAlloc` instruction that creates a new channel (thread)
 * together with its root alloc node (`allocSeq === 0`).
 *
 * The thread account is a fresh keypair whose pubkey is the channel identity
 * (`seed` == its 32 address bytes); it co-signs its own creation, so there is
 * no global counter and channel creation touches no shared writable account.
 * A random treasury shard is picked internally to spread fee writes.
 *
 * @param programId - The deployed Txtcel program address.
 * @param payer - Fee payer; signs and funds account rent.
 * @param seed - The new thread's 32-byte identity (its account pubkey bytes).
 * @param messageFee - Per-message author fee in lamports (default `0n`).
 * @param title - Channel title; must be ≤ `MAX_TITLE_LEN` UTF-8 bytes (default `''`).
 * @returns The assembled `TransactionInstruction`.
 * @throws If `title` exceeds `MAX_TITLE_LEN` bytes.
 */
export function buildCreateRootAllocInstruction(
  programId: PublicKey,
  payer: PublicKey,
  seed: Uint8Array,
  messageFee: bigint = 0n,
  title: string = '',
) {
  const titleBytes = new TextEncoder().encode(title)
  if (titleBytes.length > MAX_TITLE_LEN) {
    throw new Error(`Title is too long (max ${MAX_TITLE_LEN} bytes)`)
  }
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
      signerMeta(payer),
      signerMeta(threadAccount),
      writableMeta(allocAccount),
      readonlyMeta(settingsAccount),
      writableMeta(treasuryShard),
      readonlyMeta(SystemProgram.programId),
    ],
    data: Buffer.from(CreateRootAllocInstr.serialize({
      tag: Instruction.CreateRootAlloc,
      messageFee,
      treasuryShardIdx,
      title: titleBytes,
    })),
  })
}
