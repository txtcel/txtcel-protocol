// Fees domain: the per-channel fee setters, the platform fee-cut setters (plus
// the `setFee` dispatch helper) and the treasury / author-fee sweep builders.
export { buildSetFeeInstruction } from './setFee'
export type { FeeKind } from './setFee'
export { buildSetBaseFeeInstruction } from './setBaseFee'
export { buildSetMessageFeeInstruction } from './setMessageFee'
export { buildSetLikeFeeInstruction } from './setLikeFee'
export { buildSetEntryFeeInstruction } from './setEntryFee'
export { buildSetAuthorFeeCutInstruction } from './setAuthorFeeCut'
export { buildSetEntryCutInstruction } from './setEntryCut'
export { buildSetLikeCutInstruction } from './setLikeCut'
export { buildSweepTreasuryInstruction } from './sweepTreasury'
export { buildSweepAuthorFeesInstruction } from './sweepAuthorFees'
