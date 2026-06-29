import { TAG_SETTINGS } from '../constants/program'
import type { ProgramSettingsData } from '../types/program'
import { ProgramSettingsSchema, pubkeyToBase58 } from './schemas'

/**
 * Decodes the raw global settings account into {@link ProgramSettingsData}
 * (admin, treasury and the four platform fee cuts in basis points).
 *
 * @param pubkey - The account's base58 address (carried through onto the result).
 * @param data - The raw account data bytes.
 * @returns The decoded settings.
 * @throws If the tag byte is not `TAG_SETTINGS`.
 */
export function decodeSettings(pubkey: string, data: Uint8Array): ProgramSettingsData {
  const raw = ProgramSettingsSchema.deserialize(data)
  if (raw.tag !== TAG_SETTINGS) throw new Error('Invalid ProgramSettings tag')

  return {
    pubkey,
    admin: pubkeyToBase58(raw.admin),
    treasury: pubkeyToBase58(raw.treasury),
    baseFeeBps: raw.baseFeeBps,
    authorFeeCutBps: raw.authorFeeCutBps,
    entryCutBps: raw.entryCutBps,
    likeCutBps: raw.likeCutBps,
  }
}
