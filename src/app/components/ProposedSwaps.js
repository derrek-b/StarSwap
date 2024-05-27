'use client'

// Dependencies
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import BN from 'bn.js'
import { createHash } from 'crypto'

// Components
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'
import Spinner from 'react-bootstrap/Spinner'

// Classes & Helpers
import { Escrow } from '../classes/Escrow'
import { EscrowCoordinator } from '../classes/EscrowCoordinator'
import { GetAssetName } from '../helpers/Helpers'

const ProposedSwaps = () => {
  //const { publicKey, sendTransaction } = useWallet()  //Devnet and prod

  // localhost only
  const array = Uint8Array.from(process.env.NEXT_PUBLIC_PHANTOM_ON_CLI.split(',').slice(0,32))
  const keypair = web3.Keypair.fromSeed(array)
  const publicKey = keypair.publicKey

  const connection = useConnection()
  const [isLoading, setIsLoading] = useState(true)
  const [proposedTrades, setProposedTrades] = useState([])

  const getProposedTrades = () => {
    //connection.connection.getProgramAccounts(new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID))
    EscrowCoordinator.getProposedTrades(connection, publicKey.toBase58())
      .then(async (accounts) => {
        const trades = accounts.map(({ account }) => {
          return Escrow.deserializeProposedTrade(connection, account.data)
        })

        trades.forEach(async (trade) => {
          const tradeAccount = await EscrowCoordinator.getTradeByHash(connection, trade.hash)
          const escrow = Escrow.deserialize(connection, tradeAccount.account.data)
          trade.creator = escrow.creator.slice(0, 4) + '...' + escrow.creator.slice(-4)
          trade.partner_asset = escrow.partner_asset
          trade.partner_asset_amount = escrow.partner_asset_amount.toString()
          trade.sending_asset_account = escrow.sending_asset_account

          const bytes_info = await connection.connection.getParsedAccountInfo(new web3.PublicKey(escrow.sending_asset_account))
          trade.user_asset = bytes_info.value.data.parsed.info.mint
          trade.user_asset_amount = bytes_info.value.data.parsed.info.tokenAmount.uiAmount
          console.log('prop trade', trade)
          setProposedTrades(trades)
          setIsLoading(false)
        })
      })
  }

  const acceptTrade = (index) => {
    console.log(`Button clicked for trade #${proposedTrades[index].index}`)
  }

  const cancelTrade = async (index) => {
    const trade = proposedTrades[index]
    console.log(`Canceling trade ${trade.hash}`)
  }

  useEffect(() => {
    if (isLoading) {
      getProposedTrades()
    }
  }, [isLoading])

  return (
    <div>
      <h2>Open Proposed Trades</h2>
        {isLoading ? (
          <Spinner animation='border' variant='secondary'></Spinner>
        ) : (
          <Table bordered striped>
            <thead>
              <tr>
                <th>Trade Asset</th>
                <th>Amount</th>
                <th>Trade Partner</th>
                <th>Trade For</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
                {proposedTrades.map((trade, index) => (
                <tr key={index}>
                  <td>{GetAssetName(trade.partner_asset, connection)}</td>
                  <td>{trade.partner_asset_amount}</td>
                  <td>{trade.creator}</td>
                  <td>{GetAssetName(trade.user_asset, connection)}</td>
                  <td>{trade.user_asset_amount}</td>
                  <td>
                    <Button variant='success' onClick={() => acceptTrade(index)}>&#10003;</Button>
                    <span> </span>
                    <Button variant='danger' onClick={() => cancelTrade(index)}>&times;</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
    </div>
  )
}

export default ProposedSwaps
