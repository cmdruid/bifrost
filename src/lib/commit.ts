import { Buff, Bytes }        from '@cmdcode/buff'
import { H, G }               from '@/ecc/index.js'
import { _0n, _1n }           from '@/const.js'
import { assert, get_record } from '@/util/index.js'

import {
  generate_nonce,
  get_pubkey
} from './helpers.js'

import type {
  CurveElement,
  CommitPackage,
  SecretShare,
  PublicNonce,
  BindFactor
} from '@/types/index.js'

export function get_nonce_ids (
  pnonces : PublicNonce[]
) : bigint[] {
  return pnonces.map(pn => BigInt(pn.idx))
}

/**
 * Constructs a byte-prefix for the signing session.
 */
export function get_commit_prefix (
  pnonces  : PublicNonce[],
  group_pk : string,
  message  : string
) : Buff {
  const msg_bytes   = Buff.hex(message)
  const msg_hash    = H.H4(msg_bytes)
  const commit_list = get_group_commit(pnonces)
  const commit_hash = H.H5(commit_list)
  return Buff.join([ group_pk, msg_hash, commit_hash ])
}

export function get_group_commit (
  pnonces : PublicNonce[]
) {
  let enc_group_commit : Bytes[] = []
  for (const { idx, hidden_pn, binder_pn } of pnonces) {
    const enc_commit = [ G.SerializeScalar(idx), hidden_pn, binder_pn ]
    enc_group_commit = [ ...enc_group_commit, ...enc_commit ]
  }
  return Buff.join(enc_group_commit)
}

export function get_bind_factor (
  binders : BindFactor[],
  idx     : number
) : bigint {
  for (const bind of binders) {
    if (idx === bind.idx) {
      return Buff.bytes(bind.factor).big
    }
  }
  throw new Error('invalid participant')
}

/**
 * Computes the binding values for each public nonce.
 */
export function get_commit_binders (
  nonces : PublicNonce[],
  prefix : Bytes
) : BindFactor[] {
  return nonces.map(({ idx }) => {
    const scalar    = G.SerializeScalar(idx)
    const rho_input = Buff.join([ prefix, scalar ])
    return { idx, factor: H.H1(rho_input).hex }
  })
}

/**
 * Computes the group public nonce for the signing session.
 */
export function get_group_nonce (
  pnonces : PublicNonce[],
  binders : BindFactor[]
) : string {
  let group_commit : CurveElement | null = null

  for (const { idx, binder_pn, hidden_pn } of pnonces) {
    const hidden_elem   = G.DeserializeElement(hidden_pn)
    const binding_elem  = G.DeserializeElement(binder_pn)
    const bind_factor   = get_bind_factor(binders, idx)
    const factored_elem = G.ScalarMulti(binding_elem, bind_factor)
    group_commit = G.ElementAdd(group_commit, hidden_elem)
    group_commit = G.ElementAdd(group_commit, factored_elem)
  }
  assert.exists(group_commit)
  return G.SerializeElement(group_commit).hex
}

/**
 * Creates a commitment package for a FROST signing session.
 */
export function create_commit_pkg (
  secret_share : SecretShare,
  hidden_seed ?: string,
  binder_seed ?: string
) : CommitPackage {
  const { idx, seckey } = secret_share
  const binder_sn = generate_nonce(seckey, binder_seed).hex
  const hidden_sn = generate_nonce(seckey, hidden_seed).hex
  const binder_pn = get_pubkey(binder_sn)
  const hidden_pn = get_pubkey(hidden_sn)
  return { idx, binder_pn, binder_sn, hidden_pn, hidden_sn }
}

export function get_commit_pkg (
  commits : CommitPackage[],
  share   : SecretShare
) : CommitPackage {
  const idx    = share.idx
  return get_record(commits, idx)
}
