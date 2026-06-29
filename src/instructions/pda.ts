import { PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import {
  BPF_LOADER_UPGRADEABLE_ID,
  N_AUTHOR_FEE_SHARDS,
  N_FOLLOWER_SHARDS,
  N_TREASURY_SHARDS,
  SEED_ACCESS,
  SEED_ACL,
  SEED_ALLOC,
  SEED_AUTHOR_FEE,
  SEED_CONTENT,
  SEED_FOLLOWER_COUNT,
  SEED_FOLLOWS,
  SEED_LIKES,
  SEED_SETTINGS,
  SEED_TREASURY_SHARD,
} from '../constants/program'

/**
 * Encodes a number as 4 little-endian bytes — the seed format the program uses
 * for `u32` PDA seeds (e.g. `allocSeq`). Must match the on-chain encoding.
 *
 * @param value - The unsigned 32-bit value.
 * @returns A 4-byte little-endian buffer.
 */
export function u32Seed(value: number) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value, 0)
  return buffer
}

/**
 * Encodes a number as 2 little-endian bytes — the seed format the program uses
 * for `u16` PDA seeds (e.g. treasury shard index). Must match the on-chain
 * encoding.
 *
 * @param value - The unsigned 16-bit value.
 * @returns A 2-byte little-endian buffer.
 */
export function u16Seed(value: number) {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16LE(value, 0)
  return buffer
}

/**
 * Derives the global settings PDA. Seeds: `[SEED_SETTINGS]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @returns The settings account address.
 */
export function deriveSettingsPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from(SEED_SETTINGS)], programId)[0]
}

/**
 * Returns the thread account address. The thread is now a full-address account
 * (a fresh keypair created at channel creation), not a PDA — so its `seed`
 * (the 32 identity bytes child PDAs derive from) IS its pubkey. Kept named
 * `deriveThreadPda` so existing call sites stay unchanged.
 *
 * @param _programId - Unused; kept for signature symmetry with other derivers.
 * @param seed - The thread's 32-byte identity (its account pubkey bytes).
 * @returns The thread account address.
 */
export function deriveThreadPda(_programId: PublicKey, seed: Uint8Array) {
  return new PublicKey(seed)
}

/**
 * Derives an alloc node PDA. Seeds: `[SEED_ALLOC, seed, u32(allocSeq)]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param seed - The owning thread's 32-byte identity.
 * @param allocSeq - The alloc sequence number.
 * @returns The alloc node address.
 */
export function deriveAllocPda(programId: PublicKey, seed: Uint8Array, allocSeq: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_ALLOC), Buffer.from(seed), u32Seed(allocSeq)],
    programId,
  )[0]
}

/**
 * Derives a content (message) PDA.
 * Seeds: `[SEED_CONTENT, seed, u32(allocSeq), [slot]]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param seed - The owning thread's 32-byte identity.
 * @param allocSeq - The alloc sequence the slot belongs to.
 * @param slot - The slot index within the alloc.
 * @returns The content account address.
 */
export function deriveContentPda(programId: PublicKey, seed: Uint8Array, allocSeq: number, slot: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_CONTENT), Buffer.from(seed), u32Seed(allocSeq), Buffer.from([slot])],
    programId,
  )[0]
}

/**
 * Derives a thread's `ThreadAccess` (gating) PDA. Seeds: `[SEED_ACCESS, seed]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param seed - The owning thread's 32-byte identity.
 * @returns The `ThreadAccess` account address.
 */
export function deriveAccessPda(programId: PublicKey, seed: Uint8Array) {
  return PublicKey.findProgramAddressSync([Buffer.from(SEED_ACCESS), Buffer.from(seed)], programId)[0]
}

/**
 * Derives a per-wallet `AccessEntry` PDA (one wallet's membership record for a
 * thread). Seeds: `[SEED_ACL, seed, wallet]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param seed - The owning thread's 32-byte identity.
 * @param wallet - The member wallet.
 * @returns The `AccessEntry` account address.
 */
export function deriveAccessEntryPda(programId: PublicKey, seed: Uint8Array, wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_ACL), Buffer.from(seed), wallet.toBytes()],
    programId,
  )[0]
}

/**
 * Derives an alloc's `AllocLikes` counter PDA.
 * Seeds: `[SEED_LIKES, seed, u32(allocSeq)]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param seed - The owning thread's 32-byte identity.
 * @param allocSeq - The alloc sequence number.
 * @returns The `AllocLikes` account address.
 */
export function deriveLikesPda(programId: PublicKey, seed: Uint8Array, allocSeq: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_LIKES), Buffer.from(seed), u32Seed(allocSeq)],
    programId,
  )[0]
}

/**
 * Derives a treasury vault shard PDA. Treasury fees are split across
 * `N_TREASURY_SHARDS` shards to reduce write contention.
 * Seeds: `[SEED_TREASURY_SHARD, u16(shard)]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param shard - The shard index in `[0, N_TREASURY_SHARDS)`.
 * @returns The treasury shard address.
 */
export function deriveTreasuryShardPda(programId: PublicKey, shard: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_TREASURY_SHARD), u16Seed(shard)],
    programId,
  )[0]
}

/**
 * Derives a per-channel author-fee vault shard PDA. Author fees are split
 * across `N_AUTHOR_FEE_SHARDS` shards per channel.
 * Seeds: `[SEED_AUTHOR_FEE, seed, [shard]]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param seed - The owning thread's 32-byte identity.
 * @param shard - The shard index in `[0, N_AUTHOR_FEE_SHARDS)`.
 * @returns The author-fee shard address.
 */
export function deriveAuthorFeePda(programId: PublicKey, seed: Uint8Array, shard: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_AUTHOR_FEE), Buffer.from(seed), Buffer.from([shard])],
    programId,
  )[0]
}

/**
 * Derives a wallet's `FollowRegistry` PDA (its list of followed channels).
 * Seeds: `[SEED_FOLLOWS, owner]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param owner - The wallet that owns the registry.
 * @returns The `FollowRegistry` account address.
 */
export function deriveFollowRegistryPda(programId: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_FOLLOWS), owner.toBytes()],
    programId,
  )[0]
}

/**
 * Derives one shard of a channel's follower counter.
 * Seeds: `[SEED_FOLLOWER_COUNT, seed, [shard]]`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param seed - The channel's 32-byte identity.
 * @param shard - The shard index in `[0, N_FOLLOWER_SHARDS)`.
 * @returns The `FollowerShard` account address.
 */
export function deriveFollowerShardPda(programId: PublicKey, seed: Uint8Array, shard: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_FOLLOWER_COUNT), Buffer.from(seed), Buffer.from([shard])],
    programId,
  )[0]
}

/**
 * Maps a wallet to its follower-counter shard. Must match `follower_shard_index`
 * in state.rs (first wallet byte modulo the shard count) so subscribe and
 * unsubscribe target the same shard.
 *
 * @param wallet - The follower wallet.
 * @returns The shard index in `[0, N_FOLLOWER_SHARDS)`.
 */
export function followerShardIndex(wallet: PublicKey): number {
  return wallet.toBytes()[0] % N_FOLLOWER_SHARDS
}

/**
 * Picks a random treasury shard index, used to spread fee writes across shards.
 *
 * @returns A random index in `[0, N_TREASURY_SHARDS)`.
 */
export function randomTreasuryShard(): number {
  return Math.floor(Math.random() * N_TREASURY_SHARDS)
}

/**
 * Picks a random author-fee shard index, used to spread fee writes across shards.
 *
 * @returns A random index in `[0, N_AUTHOR_FEE_SHARDS)`.
 */
export function randomAuthorFeeShard(): number {
  return Math.floor(Math.random() * N_AUTHOR_FEE_SHARDS)
}

/**
 * Derives the BPF loader ProgramData account that stores the program's upgrade
 * authority (the "deploy author"). Seeds: `[programId]` under the upgradeable
 * loader.
 *
 * @param programId - The deployed Txtcel program address.
 * @returns The ProgramData account address.
 */
export function deriveProgramDataPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [programId.toBytes()],
    new PublicKey(BPF_LOADER_UPGRADEABLE_ID),
  )[0]
}
