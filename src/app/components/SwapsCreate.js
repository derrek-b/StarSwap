// Dependencies
//import { getKeypairFromEnvironment } from '@solana-developers/helpers' // localhost only
import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import * as borsh from '@project-serum/borsh'
const { createHash } = require('crypto')
import config from '../config.json'
require('dotenv').config()
import BN from 'bn.js'

// Components
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Button from 'react-bootstrap/Button'

// Classes
import { Escrow } from '../classes/Escrow'


const SwapsCreate = () => {
  //const { publicKey, sendTransaction } = useWallet()  //Devnet and prod

  // localhost only
  const array = Uint8Array.from(process.env.NEXT_PUBLIC_PHANTOM_ON_CLI.split(',').slice(0,32))
  const keypair = web3.Keypair.fromSeed(array)
  const publicKey = keypair.publicKey

  const connection = useConnection()

  const [userAsset, setUserAsset] = useState(null)
  const [userAssetAmount, setUserAssetAmount] = useState()
  const [userAssetBalance, setUserAssetBalance] = useState(0)
  const [partnerAsset, setPartnerAsset] = useState(null)
  const [partnerAssetAmount, setPartnerAssetAmount] = useState()
  const [partnerAssetBalance, setPartnerAssetBalance] = useState(0)
  const [partnerAddress, setPartnerAddress] = useState('')
  const [network, setNetwork] = useState('localhost')

  const createSwap = async (e) => {
    e.preventDefault()
    const userAssetPK = new web3.PublicKey(userAsset)
    const partnerAssetPK = new web3.PublicKey(partnerAsset)

    const partnerAssetDecimals = (await connection.getParsedAccountInfo(new web3.PublicKey(partnerAsset))).value.data.parsed.info.decimals
    const amount = partnerAssetDecimals === 0 ? partnerAssetAmount : partnerAssetAmount * 10 ** partnerAssetDecimals
    const u64Amount = new BN(amount, 'le')
    const escrow = new Escrow(
      partnerAddress,
      u64Amount,
    )

    const buffer = escrow.serialize()

    const tx = new web3.Transaction()

    const tempAccount = web3.Keypair.generate()
    const mint = await token.getMint(connection, userAssetPK)
    const space = 200
    const lamports = await connection.getMinimumBalanceForRentExemption(space);
    const tempTA = await token.getAssociatedTokenAddress(userAssetPK, tempAccount.publicKey)

    // Create temp account instruction
    const tempAccountIx = web3.SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: tempAccount.publicKey,
        space,
        lamports,
        programId: token.TOKEN_PROGRAM_ID,
    })

    // Create temp ATA instruction
    const tempTAIx = token.createAssociatedTokenAccountInstruction(
      publicKey,
      tempTA,
      tempAccount.publicKey,
      userAssetPK,
    )

    // Create transfer instruction
    const userAssetDecimals = (await connection.getParsedAccountInfo(userAssetPK)).value.data.parsed.info.decimals
    const userAssetATA = await token.getAssociatedTokenAddress(userAssetPK, publicKey)

    console.log(userAssetATA, tempTA, publicKey)

    const transferIx = token.createTransferInstruction(
      userAssetATA,
      tempTA,
      publicKey,
      userAssetDecimals === 0 ? userAssetAmount : userAssetAmount * 10 ** userAssetDecimals,
    )

    // Create escrow instruction
    const userReceivingAssetATA = await token.getAssociatedTokenAddress(partnerAssetPK, publicKey)

    // Create escrow PDA account
    let escrowHash = createHash('sha256').update(publicKey + partnerAddress + userAssetPK + partnerAssetPK).digest('hex')
    const [escrowPDA] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from(escrowHash.substring(0, 32))],
      new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
    )

    // Create partner PDA account
    let partnerHash = createHash('sha256').update(escrowHash + partnerAddress).digest('hex')
    const [partnerPda] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from(partnerHash.substring(0, 32))],
      new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
    )

    const createEscrowIx = new web3.TransactionInstruction({
      keys: [
        {
          pubkey: publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: tempTA,
          isSigner: false,
          isWritable: false,  //becomes writable if transfer of ownership is moved inside solana program
        },
        {
          pubkey: userReceivingAssetATA,  //this needs to be the ATA of the token the user is receiving
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: escrowPDA,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: partnerPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: web3.SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID,),
      data: buffer,
    })

    // Change temp account ownership instruction
    const changeOwnerIx = token.createSetAuthorityInstruction(
      tempTA,
      tempAccount.publicKey,
      token.AuthorityType.AccountOwner,
      escrowPDA
    )

    tx.add(tempAccountIx, tempTAIx, transferIx, createEscrowIx, changeOwnerIx)

    console.log('instructions created...')

    try {
      const txSig = await web3.sendAndConfirmTransaction(connection, tx, [keypair, tempAccount]) // localhost
      //const txSig = await sendTransaction(tx, connection, { signers: [tempAccount] }) // devnet and prod
      console.log(txSig)
      alert('Transaction Submitted')
    } catch (e) {
      console.log(JSON.stringify(e))
      alert(JSON.stringify(e))
    }

    // setUserAsset(null)
    // setUserAssetBalance(0)
    // setUserForAsset(null)
    // setUserForAssetBalance(0)
    // setPartnerAddress('')
    // document.querySelector('#user_asset').textContent = 'Select Asset'
    // document.querySelector('#partner_asset').textContent = 'Select Asset'
  }

  const userAssetSelected = (e) => {
    setUserAsset(e)
    const button = document.querySelector('#user_asset')

    setDDButton(e, button)

    getUserAssetBalance(e)
  }

  const partnerAssetSelected = (e) => {
    setPartnerAsset(e)
    const button = document.querySelector('#partner_asset')

    setDDButton(e, button)

    getPartnerAssetBalance(e)
  }

  const getUserAssetBalance = async (e) => {
    const userAssetMint = new web3.PublicKey(e)

    const userAssetATA = await token.getAssociatedTokenAddress(
      userAssetMint,
      publicKey,
    )

    try {
      console.log('trying to get asset balance...')
      const info = await token.getAccount(connection, userAssetATA)
      const mint = await token.getMint(connection, info.mint)
      setUserAssetBalance(Number(info.amount) / (10 ** mint.decimals))
    }catch {
      console.log('catching failure to get asset balance...')
      setUserAssetBalance(null)
    }
  }

  const getPartnerAssetBalance = async (e) => {
    const partnerAssetMint = new web3.PublicKey(e)

    const artnerAssetATA = await token.getAssociatedTokenAddress(
      partnerAssetMint,
      publicKey,
    )

    try {
      console.log('trying to get for asset balance...')
      const info = await token.getAccount(connection, partnerAssetATA)
      const mint = await token.getMint(connection, info.mint)
      setPartnerAssetBalance(Number(info.amount) / (10 ** mint.decimals))
    }catch {
      console.log('catching failure to get for asset balance...')
      setPartnerAssetBalance(null)
    }
  }

  const setDDButton = (e, button) => {
    switch (e) {
      case config[network].atlasMint:
        button.textContent = 'Atlas'
        break
      case config[network].polisMint:
        button.textContent = 'Polis'
        break
      case config[network].foodMint:
        button.textContent = 'Food'
        break
      case config[network].fuelMint:
        button.textContent = 'Fuel'
        break
    }
  }

  useEffect(() => {
    if (connection.connection.rpcEndpoint === 'http://127.0.0.1:8899') {
      console.log('connected to localhost')
      setNetwork('localhost')
    }
  }, [])

  return (
    <div style={{ width: '600px', border: '1px solid black' }}>
      <Form onSubmit={(e) => createSwap(e)} className='mx-2'>
        {/* Asset to be swapped */}
        <Form.Text className='float-end mx-1'>Balance: {userAssetBalance}</Form.Text>
        <InputGroup className='mt-1 mb-4'>
          <DropdownButton id='user_asset' title='Select Asset' variant='outline-secondary' onSelect={(e) => userAssetSelected(e)}>
            <Dropdown.Item eventKey={config[network].atlasMint}>Atlas</Dropdown.Item>
            <Dropdown.Item eventKey={config[network].polisMint}>Polis</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item eventKey={config[network].foodMint}>Food</Dropdown.Item>
            <Dropdown.Item eventKey={config[network].fuelMint}>Fuel</Dropdown.Item>
          </DropdownButton>
          <Form.Control type='number' placeholder='Amount to send' onChange={(e) => setUserAssetAmount(e.target.value)}></Form.Control>
          <Button variant='outline-secondary'>Max</Button>
        </InputGroup>

        <hr className='create_swap_hr' />

        {/* Address to swap with */}
        <Form.Control className='mt-4 mb-3' type='text' placeholder='Address of swap partner' value={partnerAddress} onChange={(e) => setPartnerAddress(e.target.value)}></Form.Control>

        {/* Asset to swap for */}
        <Form.Text className='float-end mx-1 my-0'>Balance: {partnerAssetBalance}</Form.Text>
        <InputGroup className='mt-1 mb-4'>
          <DropdownButton id='partner_asset' title='Select Asset' variant='outline-secondary' onSelect={(e) => partnerAssetSelected(e)} required>
            <Dropdown.Item eventKey={config[network].atlasMint}>Atlas</Dropdown.Item>
            <Dropdown.Item eventKey={config[network].polisMint}>Polis</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item eventKey={config[network].foodMint}>Food</Dropdown.Item>
            <Dropdown.Item eventKey={config[network].fuelMint}>Fuel</Dropdown.Item>
          </DropdownButton>
          <Form.Control type='number' placeholder='Amount to receive' onChange={(e) => setPartnerAssetAmount(e.target.value)}></Form.Control>
        </InputGroup>

        <Button type='submit' className='maroon_bg mb-4 submit_button'>Create Swap</Button>
      </Form>
    </div>
  )
}

export default SwapsCreate
