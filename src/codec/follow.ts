import { TAG_FOLLOW_REGISTRY, TAG_FOLLOWER_SHARD } from '../constants/program'
import type { FollowRegistryData, FollowerShardData } from '../types/program'
import { FollowRegistrySchema, FollowerShardSchema, pubkeyToBase58 } from './schemas'

/**
 * Decodes a raw `FollowRegistry` account into {@link FollowRegistryData} (a
 * wallet's list of followed channels as base58 addresses).
 *
 * @param pubkey - The account's base58 address (carried through onto the result).
 * @param data - The raw account data bytes.
 * @returns The decoded follow registry.
 * @throws If the tag byte is not `TAG_FOLLOW_REGISTRY`.
 */
export function decodeFollowRegistry(pubkey: string, data: Uint8Array): FollowRegistryData {
  const raw = FollowRegistrySchema.deserialize(data)
  if (raw.tag !== TAG_FOLLOW_REGISTRY) throw new Error('Invalid FollowRegistry tag')

  return {
    pubkey,
    owner: pubkeyToBase58(raw.owner),
    channels: raw.channels.map(c => pubkeyToBase58(c)),
  }
}

/**
 * Decodes a raw `FollowerShard` counter account into {@link FollowerShardData}.
 * A channel's live follower count is the sum of all its shard `count`s (see
 * `loadFollowerCount`).
 *
 * @param pubkey - The account's base58 address (carried through onto the result).
 * @param data - The raw account data bytes.
 * @returns The decoded follower shard.
 * @throws If the tag byte is not `TAG_FOLLOWER_SHARD`.
 */
export function decodeFollowerShard(pubkey: string, data: Uint8Array): FollowerShardData {
  const raw = FollowerShardSchema.deserialize(data)
  if (raw.tag !== TAG_FOLLOWER_SHARD) throw new Error('Invalid FollowerShard tag')

  return {
    pubkey,
    thread: pubkeyToBase58(raw.thread),
    shard: raw.shard,
    count: raw.count,
  }
}
