// Public messaging surface. The implementation is split into cohesive modules
// (candidate-pool/tx-size estimation, message-transaction builders, wallet
// signing helpers, and the wallet-driven send/create flows); this barrel keeps
// the original import path (`./messaging`) and exported names unchanged.
export {
  buildSendMessageTransaction,
  buildSendMessageTransactions,
  buildExtendAllocTransaction,
} from './messageBuilders'
export {
  sendMessageWithWallet,
  createRootAlloc,
  createRootAllocWithWallet,
} from './send'
export type { WalletSigner } from './wallet'

// Per-instruction builders for the messaging domain.
export { buildCreateRootAllocInstruction } from './createRootAlloc'
export { buildFillSlotInstruction } from './fillSlot'
export { buildPrepareAllocInstruction } from './prepareAlloc'
export { buildAppendContentInstruction } from './appendContent'
export { buildCloseAccountInstruction } from './closeAccount'
export { buildLikeContentInstruction } from './likeContent'
