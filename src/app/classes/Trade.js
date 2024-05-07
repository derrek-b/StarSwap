import * as borsh from '@project-serum/borsh'

export class Trade {
  trader1
  asset1
  asset1_amount
  trader2
  asset2
  asset2_amount

  constructor(trader1, asset1, asset1_amount, trader2, asset2, asset2_amount) {
    this.trader1 = trader1
    this.asset1 = asset1
    this.asset1_amount = asset1_amount
    this.trader2 = trader2
    this.asset2 = asset2
    this.asset2_amount = asset2_amount
  }


  tradeInstructionLayout = borsh.struct([
    borsh.u8('variant'),
    borsh.str('trader1'),
    borsh.str('asset1'),
    borsh.u32('asset1_amount'),
    borsh.str('trader2'),
    borsh.str('asset2'),
    borsh.u32('asset2_amount')
  ])


  serialize() {
    const buffer = Buffer.alloc(1000)
    this.tradeInstructionLayout.encode({ ...this, variant: 0, }, buffer)
    return buffer.subarray(0, this.tradeInstructionLayout.getSpan(buffer))
  }

  static tradeAccountSchema = borsh.struct([
    borsh.bool('active'),
    borsh.str('trader1'),
    borsh.str('asset1'),
    borsh.u32('asset1_amount'),
    borsh.str('trader2'),
    borsh.str('asset2'),
    borsh.u32('asset2_amount')
  ])

  static deserialize(buffer = null) {
    if (!buffer) {
      return null
    }

    try {
      const { trader1, asset1, asset1_amount, trader2, asset2, asset2_amount } = this.tradeAccountSchema.decode(buffer)
      return new Trade(trader1, asset1, asset1_amount, trader2, asset2, asset2_amount)
    } catch (e) {
      console.log('Deserialization error', e)
      console.log(buffer)
      return null
    }
  }
}
