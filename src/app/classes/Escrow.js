import * as borsh from '@project-serum/borsh'
import * as web3 from '@solana/web3.js'
import { join } from 'path'

export class Escrow {
  is_initialized
  hash
  creator
  sending_asset_account
  user_asset
  user_asset_amount
  receiving_asset_account
  partner
  partner_asset
  partner_asset_amount

  constructor(partner, partner_asset_amount) {
    this.partner = partner
    this.partner_asset_amount = partner_asset_amount
  }


  createEscrowInstructionLayout = borsh.struct([
    borsh.u8('variant'),
    borsh.str('partner'),
    borsh.u64('partner_asset_amount')
  ])


  serialize() {
    const buffer = Buffer.alloc(1000)
    this.createEscrowInstructionLayout.encode({ variant: 0, ...this }, buffer)
    return buffer.subarray(0, this.createEscrowInstructionLayout.getSpan(buffer))
  }

  static escrowAccountSchema = borsh.struct([
    borsh.bool('is_initialized'),
    borsh.str('hash'),
    borsh.str('creator'),
    borsh.str('sending_asset_account'),
    borsh.str('receiving_asset_account'),
    borsh.str('partner'),
    borsh.str('partner_asset'),
    borsh.u64('partner_asset_amount'),
  ])

  static deserialize(connection, buffer = null) {
    if (!buffer) {
      console.log('buffer is empty')
      return null
    }

    try {
      const { is_initialized, hash, creator, sending_asset_account, receiving_asset_account, partner, partner_asset, partner_asset_amount } = this.escrowAccountSchema.decode(buffer)
      const escrow = new Escrow(partner, partner_asset_amount)
      escrow.is_initialized = is_initialized
      escrow.hash = hash
      escrow.creator = creator
      escrow.sending_asset_account = sending_asset_account
      escrow.receiving_asset_account = receiving_asset_account
      escrow.partner_asset = partner_asset

      return escrow
    } catch (e) {
      console.log('Deserialization error', e)
      console.log(buffer)
      return null
    }
  }

  static partnerEscrowAccountSchema = borsh.struct([
    borsh.bool('is_initialized'),
    borsh.str('hash'),
    borsh.str('pubkey'),
  ])

  static deserializeProposedTrade(connection, buffer = null) {
    if (!buffer) {
      console.log('buffer is empty')
      return null
    }

    try {
      const { is_initialized, hash, pubkey } = this.partnerEscrowAccountSchema.decode(buffer)
      const escrow = new Escrow()
      escrow.is_initialized = is_initialized
      escrow.hash = hash
      escrow.partner = pubkey

      return escrow
    } catch (e) {
      console.log('Deserialization error', e)
      console.log(buffer)
      return null
    }
  }
}
