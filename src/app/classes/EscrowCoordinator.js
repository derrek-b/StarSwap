// Dependencies
import * as web3 from '@solana/web3.js'
import bs58 from 'bs58'

import { Escrow } from '../classes/Escrow'

export class EscrowCoordinator {

  static getUserTrades = async (connection, pubkey) => {
    const trades = await connection.connection.getProgramAccounts(
      new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
      {
        filters:
        [
          {
            memcmp:
            {
              offset: 73,
              bytes: bs58.encode(Buffer.from(pubkey)),
            },
          },
        ]
      }
    )

    let userTrades = []
    trades.map(async (trade) => {
      if (trade.account.data.length > 300) {
        userTrades.push(trade)
      }
    })

    return userTrades
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
              offset: 73,
              bytes: bs58.encode(Buffer.from(pubkey)),
            },
          },
        ]
      }
    )

    let userTrades = []
    trades.map((trade) => {
      if (trade.account.data.length < 150) {
        userTrades.push(trade)
      }
    })

    return userTrades
  }

  static getTradeByHash = async (connection, hash) => {
    const trades = await connection.connection.getProgramAccounts(
      new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
      {
        filters:
        [
          {
            memcmp:
            {
              offset: 5,
              bytes: bs58.encode(Buffer.from(hash)),
            },
          },
        ]
      }
    )

    if (trades.length != 2) {
      return null
    }

    if (trades[0].account.data.length > 300) {
      return trades[0]
    } else {
      return trades[1]
    }
  }
}
