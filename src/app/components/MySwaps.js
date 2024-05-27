// Dependencies
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import { useState, useEffect } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
const { createHash } = require('crypto')

// Components
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'
import Spinner from 'react-bootstrap/esm/Spinner'

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

  const cancelTrade = async (index) => {
    const trade = userTrades[index]
    console.log(`Canceling trade ${trade.hash}`)

    const buffer = trade.serializeCancel(true)

    const tx = new web3.Transaction()

    // Get escrow PDA account
    let escrowHash = trade.hash
    const [escrowPDA] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from(escrowHash.substring(0, 32))],
      new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
    )

    // Get partner PDA account
    const partnerHash = createHash('sha256').update(escrowHash + trade.partner).digest('hex')
    const [partnerPda] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from(partnerHash.substring(0, 32))],
      new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
    )

    // Get creator's ATA for creator's asset
    const creatorATA = await token.getAssociatedTokenAddressSync(
      new web3.PublicKey(trade.user_asset),
      publicKey,
    )

    const ix = new web3.TransactionInstruction({
      keys: [
        {
          pubkey: publicKey,
          isSigner: true,
          isWritable: true
        },
        {
          pubkey: escrowPDA,
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: new web3.PublicKey(trade.sending_asset_account),
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: partnerPda,
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: new web3.PublicKey(creatorATA),
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: token.TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: web3.SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: buffer,
      programId: new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID)
    })

    tx.add(ix)

    try {
      console.log('sending transactions...')
      const txSig = await web3.sendAndConfirmTransaction(connection.connection, tx, [keypair])
      console.log('Transactions send: ', txSig)
    } catch(e) {
      console.log(JSON.stringify(e))
      alert(JSON.stringify(e))
    }
  }

  useEffect(() => {
    if (isLoading) {
      getUserTrades()
    }
  }, [isLoading])

  return (
    <div>
      <h2>Open Trades Created</h2>
        {isLoading ? (
          <Spinner variant='secondary'></Spinner>
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
              {userTrades.map((trade, index) => (
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
        )}

    </div>
  )
}

export default MySwaps
