import { TAG_ACCESS, TAG_ACCESS_ENTRY } from '../constants/program'
import type { AccessEntryData, ThreadAccessData } from '../types/program'
import { AccessEntrySchema, ThreadAccessSchema, pubkeyToBase58 } from './schemas'

export function decodeThreadAccess(pubkey: string, data: Uint8Array): ThreadAccessData {
  const raw = ThreadAccessSchema.deserialize(data)
  if (raw.tag !== TAG_ACCESS) throw new Error('Invalid ThreadAccess tag')

  return {
    pubkey,
    seed: raw.thread,
    enabled: raw.enabled !== 0,
    admin: pubkeyToBase58(raw.admin),
    entryFee: raw.entryFee,
    whitelistCount: raw.whitelistCount,
  }
}

export function decodeAccessEntry(pubkey: string, data: Uint8Array): AccessEntryData {
  const raw = AccessEntrySchema.deserialize(data)
  if (raw.tag !== TAG_ACCESS_ENTRY) throw new Error('Invalid AccessEntry tag')

  return {
    pubkey,
    seed: raw.thread,
    wallet: pubkeyToBase58(raw.wallet),
    status: raw.status,
  }
}
