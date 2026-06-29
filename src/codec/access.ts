import { TAG_ACCESS, TAG_ACCESS_ENTRY } from '../constants/program'
import type { AccessEntryData, ThreadAccessData } from '../types/program'
import { AccessEntrySchema, ThreadAccessSchema, pubkeyToBase58 } from './schemas'

/**
 * Decodes a raw `ThreadAccess` (gating) account into {@link ThreadAccessData}.
 * The on-chain `enabled` byte is normalized to a boolean.
 *
 * @param pubkey - The account's base58 address (carried through onto the result).
 * @param data - The raw account data bytes.
 * @returns The decoded thread-access record.
 * @throws If the tag byte is not `TAG_ACCESS`.
 */
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

/**
 * Decodes a raw per-wallet `AccessEntry` membership record into
 * {@link AccessEntryData}. `status` is one of `ACCESS_ALLOWED` /
 * `ACCESS_DENIED` / `ACCESS_FEE_EXEMPT`.
 *
 * @param pubkey - The account's base58 address (carried through onto the result).
 * @param data - The raw account data bytes.
 * @returns The decoded access entry.
 * @throws If the tag byte is not `TAG_ACCESS_ENTRY`.
 */
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
