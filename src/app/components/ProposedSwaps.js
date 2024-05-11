// Dependencies
import * as web3 from '@solana/web3.js'
import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'

// Components
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'

// Classes & Helpers
import { Trade } from '../classes/Trade'
import { TradeCoordinator } from '../classes/TradeCoordinator'
import { GetAssetName } from '../helpers/Helpers'

const ProposedSwaps = () => {
  //const { publicKey, sendTransaction } = useWallet()  //Devnet and prod

  // localhost only
  const array = Uint8Array.from(process.env.NEXT_PUBLIC_PHANTOM_ON_CLI.split(',').slice(0,32))
  const keypair = web3.Keypair.fromSeed(array)
  const publicKey = keypair.publicKey

  const connection = useConnection()
  const [proposedTrades, setProposedTrades] = useState([])

  const getProposedTrades = () => {
    console.dir(publicKey)
    //connection.connection.getProgramAccounts(new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID))
    TradeCoordinator.getProposedTrades(connection, publicKey.toBase58())
      .then(async (accounts) => {
        const trades = accounts.map(({ account }) => {
          return Trade.deserialize(account.data)
        })

        setProposedTrades(trades)
        console.log('trades:', trades)
      })
  }

  const acceptTrade = (index) => {
    console.log(`Button clicked for trade #${proposedTrades[index].index}`)
  }

  useEffect(() => {
    if (connection && publicKey) {
      getProposedTrades()
    }
  }, [])

  return (
    <div>
      <h2>Proposed Trades</h2>
       <Table bordered striped>
        <thead>
          <tr>
            <th>Trade Asset</th>
            <th>Amount</th>
            <th>Trade Partner</th>
            <th>Trade For</th>
            <th>Amount</th>
            <th>Accept</th>
          </tr>
        </thead>
        <tbody>
          {proposedTrades && proposedTrades.map((trade, index) => (
            <tr key={index}>
              <td>{GetAssetName(trade.user_asset)}</td>
              <td>{trade.user_asset_amount}</td>
              <td>{trade.partner.slice(0, 4)}...{trade.partner.slice(-4)}</td>
              <td>{GetAssetName(trade.partner_asset)}</td>
              <td>{trade.partner_asset_amount}</td>
              <td><Button onClick={() => acceptTrade(index)}>&#10003;</Button></td>
            </tr>
          ))}
        </tbody>
       </Table>
    </div>
  )
}

export default ProposedSwaps
