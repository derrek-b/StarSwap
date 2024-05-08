// Dependencies
import * as web3 from '@solana/web3.js'
import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'

// Components
import Table from 'react-bootstrap/Table'

// Classes & Helpers
import { Trade } from '../classes/Trade'
import { GetAssetName } from '../helpers/Helpers'

const MySwaps = () => {
  //const { publicKey, sendTransaction } = useWallet()  //Devnet and prod

  // localhost only
  const array = Uint8Array.from(process.env.NEXT_PUBLIC_PHANTOM_ON_CLI.split(',').slice(0,32))
  const keypair = web3.Keypair.fromSeed(array)
  const publicKey = keypair.publicKey

  const connection = useConnection()
  const [userTrades, setUserTrades] = useState([])

  const getUserTrades = () => {
    connection.connection.getProgramAccounts(new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID))
      .then(async (accounts) => {
        const trades = accounts.map(({ account }) => {
          return Trade.deserialize(account.data)
        })

        setUserTrades(trades)
        console.log('trades:', trades)
      })
  }

  useEffect(() => {
    if (connection && publicKey) {
      getUserTrades()
    }
  }, [])

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
          </tr>
        </thead>
        <tbody>
          {userTrades && userTrades.map((trade, index) => (
            <tr key={index}>
              <td>{GetAssetName(trade.asset1)}</td>
              <td>{trade.asset1_amount}</td>
              <td>{trade.trader2.slice(0, 4)}...{trade.trader2.slice(-4)}</td>
              <td>{GetAssetName(trade.asset2)}</td>
              <td>{trade.asset2_amount}</td>
            </tr>
          ))}
        </tbody>
       </Table>
    </div>
  )
}

export default MySwaps
