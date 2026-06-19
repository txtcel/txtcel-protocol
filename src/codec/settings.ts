import { TAG_SETTINGS } from '../constants/program'
import type { ProgramSettingsData } from '../types/program'
import { ProgramSettingsSchema, pubkeyToBase58 } from './schemas'

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
