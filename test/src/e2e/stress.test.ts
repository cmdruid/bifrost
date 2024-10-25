import { Test } from 'tape'

import { get_record, random_bytes } from '@bifrost/util'

import {
  combine_partial_sigs,
  create_commit_pkg,
  create_share_pkg,
  get_pubkey,
  get_session_ctx,
  sign_msg,
  verify_final_sig,
  verify_partial_sig
} from '@bifrost/lib'

export default function (t : Test, rounds = 10, max_shares = 21) {
  t.test('Stress test the full protocol', t => {

    const failures : number[] = []

    for (let i = 0; i < rounds; i++) {

      const secrets  = [ random_bytes(32), random_bytes(32) ]
      const message  = new TextEncoder().encode('hello world!')
      const share_ct = get_random_rng(3, max_shares)
      const thold    = get_random_rng(2, share_ct - 2)
      const nseed_h = secrets[0].hex
      const nseed_b = secrets[1].hex

      try {
        // Generate a secret, package of shares, and group key.
        const { vss_commits, group_pubkey, sec_shares } = create_share_pkg(secrets, thold, share_ct)

        // This part is really slow.

        // sec_shares.forEach(e => {
        //   if (!verify_share_commit(vss_commits, e, thold)) {
        //     console.log(`share ${e.idx}:, ${e.seckey}`)
        //     throw new Error('share failed validation')
        //   }
        // })

        // Use a t amount of shares to create nonce commitments.
        const members = sec_shares.slice(0, thold).map(e => create_commit_pkg(e, nseed_h, nseed_b))

        // Collect the commitments into an array.
        const sec_nonces  = members.map(mbr => mbr.secnonce)
        const pub_nonces  = members.map(mbr => mbr.pubnonce)

        // Compute some context data for the signing session.
        const context = get_session_ctx(group_pubkey, pub_nonces, message)
        
        // Create the partial signatures for a given signing context.
        const psigs = context.identifiers.map(i => {
          const idx = Number(i)
          const sec_share = get_record(sec_shares, idx)
          const sec_nonce = get_record(sec_nonces, idx)
          const pub_nonce = get_record(pub_nonces, idx)
          const sig_share = sign_msg(context, sec_share, sec_nonce)
          const share_pk  = get_pubkey(sec_share.seckey)
          if (!verify_partial_sig(context, pub_nonce, share_pk, sig_share.psig)) {
            throw new Error('sig share failed validation')
          }
          return sig_share
        })

        // Aggregate the partial signatures into a single signature.
        const signature = combine_partial_sigs(context, psigs)
        const is_valid  = verify_final_sig(context, message, signature)

        if (!is_valid) {
          throw new Error('final signature failed validation')
        }

      } catch (err) {
        console.log('iteration:', i)
        console.log('share_min:', thold)
        console.log('share_max:', share_ct)
        console.error(err)
        failures.push(i)
      }
    }
    t.true(failures.length === 0, 'stress testing passed')
    t.end()
  })
}

function get_random_rng (min : number, max : number) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1) + min)
}
