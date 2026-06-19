import { PublicKey } from '@solana/web3.js'
import { TAG_THREAD } from '../constants/program'
import type { ThreadNodeData } from '../types/program'
import { ThreadNodeSchema, pubkeyToBase58 } from './schemas'

const textDecoder = new TextDecoder()

export function decodeThread(pubkey: string, data: Uint8Array): ThreadNodeData {
  const raw = ThreadNodeSchema.deserialize(data)
  if (raw.tag !== TAG_THREAD) throw new Error('Invalid ThreadNode tag')

  return {
    pubkey,
    // The thread is a full-address account: its identity (the value child PDAs
    // are derived from) is its own pubkey, so `seed` carries those bytes.
    seed: new PublicKey(pubkey).toBytes(),
    allocCount: raw.allocCount,
    lastAllocSeq: raw.lastAllocSeq,
    author: pubkeyToBase58(raw.author),
    messageFee: raw.messageFee,
    likeFee: raw.likeFee,
    title: textDecoder.decode(raw.title),
  }
}
