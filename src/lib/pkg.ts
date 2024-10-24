import { create_nonce_pkg } from './proto.js'
import { create_share_pkg } from './shares.js'
import { get_pubkey }       from './util.js'

import type {
  CommitPackage,
  DealerPackage,
  SecretPackage
} from '@/types/pkg.js'

export function generate_dealer_pkg (
  seeds     : string[],
  share_ct  : number,
  threshold : number
) : DealerPackage {
  const share_pkg = create_share_pkg(seeds, threshold, share_ct)
  const group_pk  = share_pkg.group_pubkey

  const commits : CommitPackage[] = []
  const secrets : SecretPackage[] = [] 

  for (const share of share_pkg.sec_shares) {
    const idx       = share.idx
    const share_sk  = share.seckey
    const share_pk  = get_pubkey(share_sk) 
    const nonce_pkg = create_nonce_pkg(share)
    const { binder_sn, hidden_sn } = nonce_pkg.secnonce
    const { binder_pn, hidden_pn } = nonce_pkg.pubnonce
    commits.push({ idx, binder_pn, hidden_pn, share_pk })
    secrets.push({ idx, binder_sn, hidden_sn, share_sk })
  }

  return { commits, group_pk, secrets, threshold }
}

export function rotate_dealer_pkg () {

}
