import { type AccountInfo, type Connection, type PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import bs58 from 'bs58'
import {
  ACCESS_ALLOWED,
  ACCESS_DENIED,
  ACCESS_FEE_EXEMPT,
  N_FOLLOWER_SHARDS,
  TAG_ACCESS,
  TAG_ACCESS_ENTRY,
  TAG_ALLOC,
  TAG_CONTENT,
  TAG_FOLLOWER_SHARD,
  TAG_FOLLOW_REGISTRY,
  TAG_LIKES,
  TAG_SETTINGS,
  TAG_THREAD,
} from '../constants/program'
import {
  decodeAccessEntry,
  decodeAlloc,
  decodeAllocLikes,
  decodeContent,
  decodeFollowRegistry,
  decodeFollowerShard,
  decodeSettings,
  decodeThread,
  decodeThreadAccess,
} from '../codec'
import type {
  AccessEntryData,
  AllocLikesData,
  AllocNodeData,
  ContentNodeData,
  FollowRegistryData,
  ProgramSettingsData,
  ThreadAccessData,
  ThreadNodeData,
} from '../types/program'
import { deriveFollowRegistryPda, deriveFollowerShardPda, deriveSettingsPda } from './pda'

/**
 * Asserts a fetched account is program-owned and carries the expected tag byte.
 * Throws the same `${name} not owned by program` / `Invalid ${name} data`
 * messages the loaders have always used.
 *
 * @param info - The fetched account info.
 * @param programId - The expected owning program.
 * @param tag - The expected discriminator (first data byte).
 * @param name - Human-readable account name used in error messages.
 */
function assertOwnedTag(
  info: AccountInfo<Buffer>,
  programId: PublicKey,
  tag: number,
  name: string,
): void {
  if (!info.owner.equals(programId)) throw new Error(`${name} not owned by program`)
  if (info.data.length === 0 || info.data[0] !== tag) throw new Error(`Invalid ${name} data`)
}

/**
 * Fetches a required tagged account at `'confirmed'`, throwing `${name} not
 * found` when absent and validating owner + tag.
 *
 * @returns The validated account info.
 */
async function fetchRequiredAccount(
  connection: Connection,
  programId: PublicKey,
  key: PublicKey,
  tag: number,
  name: string,
): Promise<AccountInfo<Buffer>> {
  const info = await connection.getAccountInfo(key, 'confirmed')
  if (!info) throw new Error(`${name} not found`)
  assertOwnedTag(info, programId, tag, name)
  return info
}

/**
 * Fetches an optional tagged account at `'confirmed'`, returning `null` when
 * absent but still validating owner + tag when present.
 *
 * @returns The validated account info, or `null` when the account does not exist.
 */
async function fetchOptionalAccount(
  connection: Connection,
  programId: PublicKey,
  key: PublicKey,
  tag: number,
  name: string,
): Promise<AccountInfo<Buffer> | null> {
  const info = await connection.getAccountInfo(key, 'confirmed')
  if (!info) return null
  assertOwnedTag(info, programId, tag, name)
  return info
}

/**
 * Type guard for the multi-account scan paths: true when an account exists, is
 * program-owned and carries `tag`. Unlike the fetch helpers it never throws, so
 * invalid entries can simply be skipped.
 */
function isOwnedTag(
  info: AccountInfo<Buffer> | null,
  programId: PublicKey,
  tag: number,
): info is AccountInfo<Buffer> {
  return info !== null
    && info.owner.equals(programId)
    && info.data.length > 0
    && info.data[0] === tag
}

/**
 * Fetches and decodes a thread (channel) account.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param pubkey - The thread account address.
 * @returns The decoded {@link ThreadNodeData}.
 * @throws If the account is missing, foreign-owned, or not a thread.
 */
export async function loadThreadNode(
  connection: Connection,
  programId: PublicKey,
  pubkey: PublicKey,
): Promise<ThreadNodeData> {
  const info = await fetchRequiredAccount(connection, programId, pubkey, TAG_THREAD, 'ThreadNode')
  return decodeThread(pubkey.toBase58(), info.data)
}

/**
 * Fetches and decodes an alloc node account.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param pubkey - The alloc node PDA.
 * @returns The decoded {@link AllocNodeData}.
 * @throws If the account is missing, foreign-owned, or not an alloc node.
 */
export async function loadAllocNode(
  connection: Connection,
  programId: PublicKey,
  pubkey: PublicKey,
): Promise<AllocNodeData> {
  const info = await fetchRequiredAccount(connection, programId, pubkey, TAG_ALLOC, 'AllocNode')
  return decodeAlloc(pubkey.toBase58(), info.data)
}

/**
 * Fetches and decodes a content (message) account.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param pubkey - The content PDA.
 * @returns The decoded {@link ContentNodeData}.
 * @throws If the account is missing, foreign-owned, or not a content node.
 */
export async function loadContentNode(
  connection: Connection,
  programId: PublicKey,
  pubkey: PublicKey,
): Promise<ContentNodeData> {
  const info = await fetchRequiredAccount(connection, programId, pubkey, TAG_CONTENT, 'ContentNode')
  return decodeContent(pubkey.toBase58(), info.data)
}

/**
 * Fetches and decodes the global program settings account (PDA derived
 * internally).
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @returns The decoded {@link ProgramSettingsData}, or `null` if uninitialized.
 * @throws If the account exists but is foreign-owned or not a settings account.
 */
export async function loadProgramSettings(
  connection: Connection,
  programId: PublicKey,
): Promise<ProgramSettingsData | null> {
  const settingsKey = deriveSettingsPda(programId)
  const info = await fetchOptionalAccount(connection, programId, settingsKey, TAG_SETTINGS, 'ProgramSettings')
  if (!info) return null
  return decodeSettings(settingsKey.toBase58(), info.data)
}

/**
 * Fetches and decodes a channel's `ThreadAccess` (gating) account.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param accessKey - The `ThreadAccess` PDA.
 * @returns The decoded {@link ThreadAccessData}.
 * @throws If the account is missing, foreign-owned, or not a thread-access account.
 */
export async function loadThreadAccess(
  connection: Connection,
  programId: PublicKey,
  accessKey: PublicKey,
): Promise<ThreadAccessData> {
  const info = await fetchRequiredAccount(connection, programId, accessKey, TAG_ACCESS, 'ThreadAccess')
  return decodeThreadAccess(accessKey.toBase58(), info.data)
}

/**
 * Fetches and decodes an alloc's `AllocLikes` counter account.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param pubkey - The `AllocLikes` PDA.
 * @returns The decoded {@link AllocLikesData}, or `null` if no likes exist yet.
 * @throws If the account exists but is foreign-owned or not a likes account.
 */
export async function loadAllocLikes(
  connection: Connection,
  programId: PublicKey,
  pubkey: PublicKey,
): Promise<AllocLikesData | null> {
  const info = await fetchOptionalAccount(connection, programId, pubkey, TAG_LIKES, 'AllocLikes')
  if (!info) return null
  return decodeAllocLikes(pubkey.toBase58(), info.data)
}

/**
 * Lists all AccessEntry PDAs for a thread (membership records). The on-chain
 * size limit was removed, so the whitelist/blacklist are now reconstructed for
 * the UI by scanning program accounts filtered by tag + seed.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param seed - The thread's 32-byte identity.
 * @returns Base58 wallet lists grouped by status: `whitelist` (allowed),
 *   `blacklist` (denied) and `feeExempt`.
 */
export async function loadAccessEntries(
  connection: Connection,
  programId: PublicKey,
  seed: Uint8Array,
): Promise<{ whitelist: string[]; blacklist: string[]; feeExempt: string[] }> {
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: 'confirmed',
    filters: [
      { memcmp: { offset: 0, bytes: bs58.encode(Buffer.from([TAG_ACCESS_ENTRY])) } },
      { memcmp: { offset: 1, bytes: bs58.encode(Buffer.from(seed)) } },
    ],
  })

  const whitelist: string[] = []
  const blacklist: string[] = []
  const feeExempt: string[] = []

  for (const { account } of accounts) {
    if (account.data.length === 0 || account.data[0] !== TAG_ACCESS_ENTRY) continue
    const entry: AccessEntryData = decodeAccessEntry('', account.data)
    if (entry.status === ACCESS_ALLOWED) whitelist.push(entry.wallet)
    else if (entry.status === ACCESS_DENIED) blacklist.push(entry.wallet)
    else if (entry.status === ACCESS_FEE_EXEMPT) feeExempt.push(entry.wallet)
  }

  return { whitelist, blacklist, feeExempt }
}

/**
 * Loads a wallet's on-chain channel registry (the list of channels it follows).
 * Returns `null` when the wallet has never followed anything (PDA not created).
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param owner - The wallet whose follow registry to load.
 * @returns The decoded {@link FollowRegistryData}, or `null` if none exists.
 * @throws If the account exists but is foreign-owned or not a follow registry.
 */
export async function loadFollowRegistry(
  connection: Connection,
  programId: PublicKey,
  owner: PublicKey,
): Promise<FollowRegistryData | null> {
  const registryKey = deriveFollowRegistryPda(programId, owner)
  const info = await fetchOptionalAccount(connection, programId, registryKey, TAG_FOLLOW_REGISTRY, 'FollowRegistry')
  if (!info) return null
  return decodeFollowRegistry(registryKey.toBase58(), info.data)
}

/**
 * Returns a channel's live follower count by summing all counter shards in a
 * single batched RPC. Missing or invalid shards count as zero.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param seed - The channel's 32-byte identity.
 * @returns The total follower count across all shards.
 */
export async function loadFollowerCount(
  connection: Connection,
  programId: PublicKey,
  seed: Uint8Array,
): Promise<bigint> {
  const shardKeys = Array.from({ length: N_FOLLOWER_SHARDS }, (_, shard) =>
    deriveFollowerShardPda(programId, seed, shard),
  )
  const infos = await connection.getMultipleAccountsInfo(shardKeys, 'confirmed')

  let total = 0n
  for (let i = 0; i < infos.length; i++) {
    const info = infos[i]
    if (!isOwnedTag(info, programId, TAG_FOLLOWER_SHARD)) continue
    total += decodeFollowerShard(shardKeys[i].toBase58(), info.data).count
  }
  return total
}

/**
 * Batch-loads `ThreadNode` accounts for many channels at once (chunked to the
 * RPC's 100-key limit per call). Used to resolve channel titles/metadata for a
 * follow list without storing them on-chain. Missing or invalid channels are
 * omitted from the result map (keyed by base58 address).
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param channels - Channel (thread) addresses to resolve.
 * @returns A map from base58 address to decoded {@link ThreadNodeData}.
 */
export async function loadThreadNodesBatched(
  connection: Connection,
  programId: PublicKey,
  channels: PublicKey[],
): Promise<Map<string, ThreadNodeData>> {
  const result = new Map<string, ThreadNodeData>()
  const CHUNK = 100

  for (let i = 0; i < channels.length; i += CHUNK) {
    const chunk = channels.slice(i, i + CHUNK)
    const infos = await connection.getMultipleAccountsInfo(chunk, 'confirmed')
    for (let j = 0; j < infos.length; j++) {
      const info = infos[j]
      if (!isOwnedTag(info, programId, TAG_THREAD)) continue
      const key = chunk[j].toBase58()
      result.set(key, decodeThread(key, info.data))
    }
  }
  return result
}
