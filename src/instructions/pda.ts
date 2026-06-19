import { PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import {
  BPF_LOADER_UPGRADEABLE_ID,
  N_AUTHOR_FEE_SHARDS,
  N_TREASURY_SHARDS,
  SEED_ACCESS,
  SEED_ACL,
  SEED_ALLOC,
  SEED_AUTHOR_FEE,
  SEED_CONTENT,
  SEED_LIKES,
  SEED_SETTINGS,
  SEED_TREASURY_SHARD,
} from '../constants/program'

export function u32Seed(value: number) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value, 0)
  return buffer
}

export function u16Seed(value: number) {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16LE(value, 0)
  return buffer
}

export function deriveSettingsPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from(SEED_SETTINGS)], programId)[0]
}

/**
 * Returns the thread account address. The thread is now a full-address account
 * (a fresh keypair created at channel creation), not a PDA — so its `seed`
 * (the 32 identity bytes child PDAs derive from) IS its pubkey. Kept named
 * `deriveThreadPda` so existing call sites stay unchanged.
 */
export function deriveThreadPda(_programId: PublicKey, seed: Uint8Array) {
  return new PublicKey(seed)
}

export function deriveAllocPda(programId: PublicKey, seed: Uint8Array, allocSeq: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_ALLOC), Buffer.from(seed), u32Seed(allocSeq)],
    programId,
  )[0]
}

export function deriveContentPda(programId: PublicKey, seed: Uint8Array, allocSeq: number, slot: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_CONTENT), Buffer.from(seed), u32Seed(allocSeq), Buffer.from([slot])],
    programId,
  )[0]
}

export function deriveAccessPda(programId: PublicKey, seed: Uint8Array) {
  return PublicKey.findProgramAddressSync([Buffer.from(SEED_ACCESS), Buffer.from(seed)], programId)[0]
}

export function deriveAccessEntryPda(programId: PublicKey, seed: Uint8Array, wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_ACL), Buffer.from(seed), wallet.toBytes()],
    programId,
  )[0]
}

export function deriveLikesPda(programId: PublicKey, seed: Uint8Array, allocSeq: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_LIKES), Buffer.from(seed), u32Seed(allocSeq)],
    programId,
  )[0]
}

export function deriveTreasuryShardPda(programId: PublicKey, shard: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_TREASURY_SHARD), u16Seed(shard)],
    programId,
  )[0]
}

export function deriveAuthorFeePda(programId: PublicKey, seed: Uint8Array, shard: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_AUTHOR_FEE), Buffer.from(seed), Buffer.from([shard])],
    programId,
  )[0]
}

export function randomTreasuryShard(): number {
  return Math.floor(Math.random() * N_TREASURY_SHARDS)
}

export function randomAuthorFeeShard(): number {
  return Math.floor(Math.random() * N_AUTHOR_FEE_SHARDS)
}

/** The ProgramData account that stores the program's upgrade authority. */
export function deriveProgramDataPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [programId.toBytes()],
    new PublicKey(BPF_LOADER_UPGRADEABLE_ID),
  )[0]
}

