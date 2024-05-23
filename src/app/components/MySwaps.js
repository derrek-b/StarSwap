// Dependencies
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'

// Components
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'

// Classes & Helpers
import { Escrow } from '../classes/Escrow'
import { EscrowCoordinator } from '../classes/EscrowCoordinator'
import { GetAssetName } from '../helpers/Helpers'

const MySwaps = () => {
  //const { publicKey, sendTransaction } = useWallet()  //Devnet and prod

  // localhost only
  const array = Uint8Array.from(process.env.NEXT_PUBLIC_PHANTOM_ON_CLI.split(',').slice(0,32))
  const keypair = web3.Keypair.fromSeed(array)
  const publicKey = keypair.publicKey

  const connection = useConnection()
  const [isLoading, setIsLoading] = useState(true)
  const [userTrades, setUserTrades] = useState([])


  const getUserTrades = () => {
    EscrowCoordinator.getUserTrades(connection, publicKey.toBase58())
    .then(async (accounts) => {
      const trades = accounts.map(({ account }) => {
        return Escrow.deserialize(connection, account.data)
      })

      trades.forEach(async (trade) => {
        connection.connection.getParsedAccountInfo(new web3.PublicKey(trade.sending_asset_account))
          .then((bytes_info) => {
            trade.user_asset = bytes_info.value.data.parsed.info.mint
            trade.user_asset_amount = bytes_info.value.data.parsed.info.tokenAmount.uiAmount
            setUserTrades(trades)
            setIsLoading(false)
          })
      })
    })
  }

  useEffect(() => {
    if (isLoading) {
      getUserTrades()
    }
  }, [isLoading])

  return (
    <div>
      <h2>Open Trades Created</h2>
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
          {userTrades && userTrades.map((trade, index) => (
            <tr key={index}>
              <td>{GetAssetName(trade.user_asset, connection)}</td>
              <td>{trade.user_asset_amount}</td>
              <td>{trade.partner.slice(0, 4)}...{trade.partner.slice(-4)}</td>
              <td>{GetAssetName(trade.partner_asset, connection)}</td>
              <td>{(trade.partner_asset_amount).toString()}</td>
              <td><Button variant='danger' onClick={() => cancelTrade(index)}>&times;</Button></td>
            </tr>
          ))}
        </tbody>
       </Table>

    </div>
  )
}

export default MySwaps
