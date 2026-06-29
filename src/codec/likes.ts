import { TAG_LIKES } from '../constants/program'
import type { AllocLikesData } from '../types/program'
import { AllocLikesSchema } from './schemas'

/**
 * Decodes a raw `AllocLikes` counter account into {@link AllocLikesData}. The
 * fixed-size on-chain counts array is copied into a fresh array (`counts[i]` is
 * the like count for slot `i`).
 *
 * @param pubkey - The account's base58 address (carried through onto the result).
 * @param data - The raw account data bytes.
 * @returns The decoded likes counters.
 * @throws If the tag byte is not `TAG_LIKES`.
 */
export function decodeAllocLikes(pubkey: string, data: Uint8Array): AllocLikesData {
  const raw = AllocLikesSchema.deserialize(data)
  if (raw.tag !== TAG_LIKES) throw new Error('Invalid AllocLikes tag')

  return {
    pubkey,
    allocSeq: raw.allocSeq,
    counts: [...raw.counts],
  }
}
