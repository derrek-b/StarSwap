// Dependencies
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'

// Components
import Table from 'react-bootstrap/Table'

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
  const [userTrades, setUserTrades] = useState()
  const [userAssetNames, setUserAssetNames] = useState([])
  const [userAssetAmounts, setUserAssetAmounts] = useState([])

  const getUserTrades = () => {
    EscrowCoordinator.getUserTrades(connection, publicKey.toBase58())
    .then(async (accounts) => {
      const trades = accounts.map(({ pubkey, account }) => {
        return Escrow.deserialize(connection, account.data)
      })

        setUserTrades(trades)
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
      {userTrades && <Table bordered striped>
        {console.log('userTrades', userTrades)}
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
              {console.log('wtf', userAssetNames, userAssetAmounts)}
              <td>{GetAssetName(trade.user_asset, connection)}</td>
              <td>{trade.user_asset_amount}</td>
              <td>{trade.partner}</td>
              <td>{GetAssetName(trade.partner_asset, connection)}</td>
              <td>{(trade.partner_asset_amount).toString()}</td>
            </tr>
          ))}
        </tbody>
       </Table>}

    </div>
  )
}

export default MySwaps
