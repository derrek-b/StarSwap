import * as borsh from '@project-serum/borsh'

export class Trade {
  user
  user_asset
  user_asset_amount
  partner
  partner_asset
  partner_asset_amount
  index

  constructor(user, user_asset, user_asset_amount, partner, partner_asset, partner_asset_amount, index = 0) {
    this.user = user
    this.user_asset = user_asset
    this.user_asset_amount = user_asset_amount
    this.partner = partner
    this.partner_asset = partner_asset
    this.partner_asset_amount = partner_asset_amount
    this.index = index
  }


  tradeInstructionLayout = borsh.struct([
    borsh.u8('variant'),
    borsh.str('user'),
    borsh.str('user_asset'),
    borsh.u32('user_asset_amount'),
    borsh.str('partner'),
    borsh.str('partner_asset'),
    borsh.u32('partner_asset_amount')
  ])


  serialize() {
    const buffer = Buffer.alloc(1000)
    this.tradeInstructionLayout.encode({ variant: 0, user: this.user, user_asset: this.user_asset, user_asset_amount: this.user_asset_amount, partner: this.partner, partner_asset: this.partner_asset, partner_asset_amount: this.partner_asset_amount, }, buffer)
    return buffer.subarray(0, this.tradeInstructionLayout.getSpan(buffer))
  }

  static tradeAccountSchema = borsh.struct([
    borsh.u64('index'),
    borsh.bool('is_creator'),
    borsh.str('user'),
    borsh.str('user_asset'),
    borsh.u32('user_asset_amount'),
    borsh.str('partner'),
    borsh.str('partner_asset'),
    borsh.u32('partner_asset_amount'),
  ])

  static deserialize(buffer = null) {
    if (!buffer) {
      return null
    }

    try {
      const { index, is_creator, user, user_asset, user_asset_amount, partner, partner_asset, partner_asset_amount } = this.tradeAccountSchema.decode(buffer)
      return new Trade(user, user_asset, user_asset_amount, partner, partner_asset, partner_asset_amount, index)
    } catch (e) {
      console.log('Deserialization error', e)
      console.log(buffer)
      return null
    }
  }
}
