import { TAG_LIKES } from '../constants/program'
import type { AllocLikesData } from '../types/program'
import { AllocLikesSchema } from './schemas'

export function decodeAllocLikes(pubkey: string, data: Uint8Array): AllocLikesData {
  const raw = AllocLikesSchema.deserialize(data)
  if (raw.tag !== TAG_LIKES) throw new Error('Invalid AllocLikes tag')

  return {
    pubkey,
    allocSeq: raw.allocSeq,
    counts: [...raw.counts],
  }
}
