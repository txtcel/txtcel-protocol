/**
 * Instruction variant indices — maps each instruction name to its on-chain tag
 * (must match the `ProgramInstruction` enum in instruction.rs). The tag is the
 * first byte of every instruction's data, e.g. `Instruction.FillSlot === 1`.
 */
export const Instruction = {
  CreateRootAlloc: 0,
  FillSlot: 1,
  PrepareAlloc: 2,
  SweepTreasury: 3,
  SweepAuthorFees: 4,
  CloseAccount: 5,
  InitSettings: 6,
  SetTreasury: 7,
  InitThreadAccess: 8,
  SetThreadAccess: 9,
  AddToWhitelist: 10,
  RemoveFromWhitelist: 11,
  SetMessageFee: 12,
  SetBaseFee: 13,
  SetAuthorFeeCut: 14,
  SetEntryCut: 15,
  SetLikeCut: 16,
  SetLikeFee: 17,
  SetEntryFee: 18,
  RequestAccess: 19,
  LikeContent: 20,
  AddToBlacklist: 21,
  RemoveFromBlacklist: 22,
  AppendContent: 23,
  SetAdmin: 24,
  AddToFeeWhitelist: 25,
  RemoveFromFeeWhitelist: 26,
  Subscribe: 27,
  Unsubscribe: 28,
} as const
