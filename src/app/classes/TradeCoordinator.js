// Dependencies
import * as web3 from '@solana/web3.js'
import bs58 from 'bs58'

export class TradeCoordinator {

  static getUserTrades = async (connection, pubkey) => {
    const trades = await connection.connection.getProgramAccounts(
      new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
      {
        filters:
        [
          {
            memcmp:
            {
              offset: 8,
              bytes: '2',
            },
          },
          {
            memcmp:
            {
              offset: 13,
              bytes: bs58.encode(Buffer.from(pubkey)),
            },
          },
        ]
      }
    )

    return trades
  }

  static getProposedTrades = async (connection, pubkey) => {
    const trades = await connection.connection.getProgramAccounts(
      new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
      {
        filters:
        [
          {
            memcmp:
            {
              offset: 8,
              bytes: '1',
            },
          },
          {
            memcmp:
            {
              offset: 13,
              bytes: bs58.encode(Buffer.from(pubkey)),
            },
          },
        ]
      }
    )

    return trades
  }
}
