import { Buff, Bytes } from '@cmdcode/buff'
import { G }           from '@/ecc/index.js'

import type {
  BindFactor,
  PublicNonce
} from '@/types/index.js'

export function get_pubkey(secret : Bytes) {
  const scalar = Buff.bytes(secret).big
  const point  = G.ScalarBaseMulti(scalar)
  return G.SerializeElement(point).hex
}

export function get_group_commit (
  pub_nonces : PublicNonce[]
) {
  let enc_group_commit : Bytes[] = []
  for (const { idx, hidden_pn, binder_pn } of pub_nonces) {
    const enc_commit = [ G.SerializeScalar(idx), hidden_pn, binder_pn ]
    enc_group_commit = [ ...enc_group_commit, ...enc_commit ]
  }
  return Buff.join(enc_group_commit)
}

export function get_nonce_ids (
  pub_nonces : PublicNonce[]
) : bigint[] {
  return pub_nonces.map(pn => BigInt(pn.idx))
}

export function get_bind_factor (
  binders : BindFactor[],
  idx     : number
) : bigint {
  for (const binder of binders) {
    if (idx === binder.idx) {
      return Buff.bytes(binder.key).big
    }
  }
  throw new Error('invalid participant')
}
