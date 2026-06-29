// Transaction-size / serialization-layout constants used to estimate how much
// message text fits in a single `fill_slot` transaction before the remainder
// must be chunked via `append_content`. These mirror Solana's wire format and
// the program's instruction-data layout (must match instruction.rs / the codec
// schemas). They are internal to the SDK (not re-exported from the package
// root): the candidate/tx-size logic in `instructions/candidates.ts` and the
// message builders in `instructions/messageBuilders.ts` consume them directly.

/** Hard cap on a serialized Solana transaction (bytes). */
export const TX_SIZE_LIMIT = 1232
export const TX_OVERHEAD = 1 + 64 + 3 + 32 // sig_count + signature + header + blockhash
export const FILL_SLOT_FIXED_OVERHEAD = 1 + 2 + 4 + 4 + 2 + 1 + 4 + 1 + 8 // instruction data excluding text and candidates (tag + kind u16 + body_len + candidates_len + shards + reply + max_fee u64)
export const CANDIDATE_SIZE = 4 + 1 // allocSeq + slot in instruction data
export const ACCOUNT_KEY_SIZE = 32
export const FILL_SLOT_BASE_ACCOUNTS = 6 // payer, thread, settings, treasury, author_fee, system
export const FILL_SLOT_ACCESS_ACCOUNTS = 2 // access + per-wallet entry (mandatory)
// Marginal tx-size cost of co-bundling a `prepare_alloc` instruction in the
// same transaction as fill_slot: two new alloc account keys (current + next)
// plus the second instruction's header/indices/data. Only used by the
// liveness fallback (the normal post path never co-bundles).
export const PREPARE_ALLOC_MARGINAL_SIZE =
  2 * ACCOUNT_KEY_SIZE // current_alloc + new_alloc keys (payer/thread/system already present)
  + 1                  // program_id_index
  + 1 + 5              // compact(accounts) + 5 account indices
  + 1 + (1 + 4)        // compact(data_len) + data (tag + allocSeq u32)
export const CONTENT_NODE_FIXED_SIZE = 89 // ContentNode size excluding body bytes: header (1+4+1+32+32+8+4+1=83) + kind u16 (2) + Vec len prefix (4)
export const MAX_FEE_SLIPPAGE_NUM = 2n // tolerate up to 2x the expected fee
const APPEND_INSTR_ACCOUNTS = 7 // payer, content, thread, settings, treasury, author_fee, system
export const APPEND_TX_OVERHEAD =
  TX_OVERHEAD
  + 1 + (APPEND_INSTR_ACCOUNTS + 1) * ACCOUNT_KEY_SIZE // compact(keys) + keys (+ program ID)
  + 1                                                   // compact(num_instructions)
  + 1                                                   // program_id_index
  + 1 + APPEND_INSTR_ACCOUNTS                           // compact(accounts) + account indices
  + 2                                                   // compact(data_len)
  + 1 + 4 + 2 + 1                                      // tag + chunk_len u32 + treasury_shard_idx u16 + author_fee_shard_idx u8
