import * as borsh from '@project-serum/borsh'
import * as web3 from '@solana/web3.js'

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

      const user_asset_info_bytes = connection.connection.getParsedAccountInfo(new web3.PublicKey(sending_asset_account))
        .then((user_asset_info_bytes) => {
          escrow.user_asset = user_asset_info_bytes.value.data.parsed.info.mint
          escrow.user_asset_amount = user_asset_info_bytes.value.data.parsed.info.tokenAmount.uiAmount
        })

      // console.log(escrow)

      return escrow
    } catch (e) {
      console.log('Deserialization error', e)
      console.log(buffer)
      return null
    }
  }
}
