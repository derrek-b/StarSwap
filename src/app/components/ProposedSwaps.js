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
          trade.creator = escrow.creator
          trade.partner_asset = escrow.partner_asset
          trade.partner_asset_amount = escrow.partner_asset_amount
          trade.sending_asset_account = escrow.sending_asset_account

          const bytes_info = await connection.connection.getParsedAccountInfo(new web3.PublicKey(escrow.sending_asset_account))
          trade.user_asset = bytes_info.value.data.parsed.info.mint
          trade.user_asset_amount = bytes_info.value.data.parsed.info.tokenAmount.uiAmount
          setProposedTrades(trades)
          setIsLoading(false)
        })
      })
  }

  const acceptTrade = async (index) => {
    const trade = proposedTrades[index]
    console.log(`Accepting trade ${trade.hash}`)

    const buffer = trade.serializeAccept()

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

    // Get creator's ATA for receiving asset from partner
    const creatorATA = await token.getAssociatedTokenAddressSync(
      new web3.PublicKey(trade.partner_asset),
      new web3.PublicKey(trade.creator),
    )

    // Get partner's ATA for asset being sent to creator
    const partnerSendingATA = await token.getAssociatedTokenAddressSync(
      new web3.PublicKey(trade.partner_asset),
      new web3.PublicKey(trade.partner),
    )

    // Get partner's ATA for asset being sent to creator
    const partnerReceivingATA = await token.getAssociatedTokenAddressSync(
      new web3.PublicKey(trade.user_asset),
      new web3.PublicKey(trade.partner),
    )

    const ix = new web3.TransactionInstruction({
      keys: [
        {
          pubkey: publicKey, //1
          isSigner: true,
          isWritable: false
        },
        {
          pubkey: escrowPDA, //2
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: new web3.PublicKey(trade.sending_asset_account), //3
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: partnerPda, //4
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: new web3.PublicKey(creatorATA), //5
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: new web3.PublicKey(partnerSendingATA), //6
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: new web3.PublicKey(partnerReceivingATA), //7
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: token.TOKEN_PROGRAM_ID, //8
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: new web3.PublicKey(trade.creator), //9
          isSigner: false,
          isWritable: true
        },
      ],
      data: buffer,
      programId: new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID)
    })

    tx.add(ix)

    try {
      console.log('sending transaction...')
      const txSig = await web3.sendAndConfirmTransaction(connection.connection, tx, [keypair])
      console.log('Transactions send: ', txSig)
    } catch(e) {
      console.log(JSON.stringify(e))
      alert(JSON.stringify(e))
    }
  }

  const cancelTrade = async (index) => {
    const trade = proposedTrades[index]
    console.log(`Canceling trade ${trade.hash}`)

    const buffer = trade.serializeCancel(false)

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
      new web3.PublicKey(trade.creator),
    )

    const ix = new web3.TransactionInstruction({
      keys: [
        {
          pubkey: publicKey,
          isSigner: true,
          isWritable: false
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
          pubkey: new web3.PublicKey(trade.creator),
          isSigner: false,
          isWritable: true
        },
      ],
      data: buffer,
      programId: new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID)
    })

    tx.add(ix)

    try {
      console.log('sending transaction...')
      const txSig = await web3.sendAndConfirmTransaction(connection.connection, tx, [keypair])
      console.log('Transactions send: ', txSig)
    } catch(e) {
      console.log(JSON.stringify(e))
      alert(JSON.stringify(e))
    }
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
                  <td>{trade.partner_asset_amount.toString()}</td>
                  <td>{trade.creator.slice(0, 4) + '...' + trade.creator.slice(-4)}</td>
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
