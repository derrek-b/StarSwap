// Dependencies
//import { getKeypairFromEnvironment } from '@solana-developers/helpers' // localhost only
import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import * as borsh from '@project-serum/borsh'
import { sha256 } from 'crypto-hash'
require('dotenv').config()

// Components
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Button from 'react-bootstrap/Button'

// Classes
import { Trade } from '../classes/Trade'


const SwapsCreate = () => {
  //const { publicKey, sendTransaction } = useWallet()  //Devnet and prod

  // localhost only
  const array = Uint8Array.from(process.env.NEXT_PUBLIC_PHANTOM_ON_CLI.split(',').slice(0,32))
  const keypair = web3.Keypair.fromSeed(array)
  const publicKey = keypair.publicKey

  const { connection } = useConnection()

  const [tradeAsset, setTradeAsset] = useState(null)
  const [tradeAssetAmount, setTradeAssetAmount] = useState()
  const [tradeAssetBalance, setTradeAssetBalance] = useState(0)
  const [tradeForAsset, setTradeForAsset] = useState(null)
  const [tradeForAssetAmount, setTradeForAssetAmount] = useState()
  const [tradeForAssetBalance, setTradeForAssetBalance] = useState(0)
  const [partnerAddress, setPartnerAddress] = useState('')

  const createSwap = async (e) => {
    e.preventDefault()
    //console.log('creating swap...')
    const newTrade = new Trade(publicKey.toBase58(), tradeAsset, tradeAssetAmount, partnerAddress, tradeForAsset, tradeForAssetAmount)
    const buffer = newTrade.serialize()
    //console.log('buffer created...')

    const tx = new web3.Transaction()

    //console.log(publicKey + tradeAsset + partnerAddress + tradeForAsset)
    const hash = (await sha256(publicKey + tradeAsset + partnerAddress + tradeForAsset))//.substring(0, 32)
    //console.log("hash", hash)

    const [pda] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from(hash.substring(0,32))],
      new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
    )
    //console.log(pda.toBase58())

    const inst = new web3.TransactionInstruction({
      keys: [
        {
          pubkey: publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: pda,
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
      data: buffer
    })

    tx.add(inst)

    //console.log('transaction created...')

    try {
      const txSig = await web3.sendAndConfirmTransaction(connection, tx, [keypair]) // localhost
      //const txSig = await sendTransaction(tx, connection) // devnet and prod
      console.log(txSig)
      alert('Transaction Submitted')
    } catch (e) {
      console.log(JSON.stringify(e))
      alert(JSON.stringify(e))
    }

    // setTradeAsset(null)
    // setTradeAssetBalance(0)
    // setTradeForAsset(null)
    // setTradeForAssetBalance(0)
    // setPartnerAddress('')
    // document.querySelector('#trade_asset').textContent = 'Select Asset'
    // document.querySelector('#trade_for_asset').textContent = 'Select Asset'
  }

  const tradeAssetSelected = (e) => {
    setTradeAsset(e)
    const button = document.querySelector('#trade_asset')

    setDDButtonTest(e, button)

    getTradeAssetBalance(e)
  }

  const tradeForAssetSelected = (e) => {
    setTradeForAsset(e)
    const button = document.querySelector('#trade_for_asset')

    setDDButtonTest(e, button)

    getTradeForAssetBalance(e)
  }

  const getTradeAssetBalance = async (e) => {
    const tradeAssetMint = new web3.PublicKey(e)

    const userTradeAssetATA = await token.getAssociatedTokenAddress(
      tradeAssetMint,
      publicKey,
    )

    try {
      console.log('trying to get asset balance...')
      const info = await token.getAccount(connection, userTradeAssetATA)
      const mint = await token.getMint(connection, info.mint)
      setTradeAssetBalance(Number(info.amount) / (10 ** mint.decimals))
    }catch {
      console.log('catching failure to get asset balance...')
      setTradeAssetBalance(null)
    }
  }

  const getTradeForAssetBalance = async (e) => {
    const tradeForAssetMint = new web3.PublicKey(e)

    const userTradeForAssetATA = await token.getAssociatedTokenAddress(
      tradeForAssetMint,
      publicKey,
    )

    try {
      console.log('trying to get for asset balance...')
      const info = await token.getAccount(connection, userTradeForAssetATA)
      const mint = await token.getMint(connection, info.mint)
      setTradeForAssetBalance(Number(info.amount) / (10 ** mint.decimals))
    }catch {
      console.log('catching failure to get for asset balance...')
      setTradeForAssetBalance(null)
    }
  }

  const setDDButtonTest = (e, button) => {
    switch (e) {
      case process.env.NEXT_PUBLIC_ATLAS_MINT:
        button.textContent = 'Atlas'
        break
      case process.env.NEXT_PUBLIC_POLIS_MINT:
        button.textContent = 'Polis'
        break
      case process.env.NEXT_PUBLIC_AMMO_MINT:
        button.textContent = 'Ammo'
        break
      case process.env.NEXT_PUBLIC_FOOD_MINT:
        button.textContent = 'Food'
        break
      case process.env.NEXT_PUBLIC_FUEL_MINT:
        button.textContent = 'Fuel'
        break
      case process.env.NEXT_PUBLIC_TOOLKITS_MINT:
        button.textContent = 'Toolkits'
        break
    }
  }

  return (
    <div style={{ width: '600px', border: '1px solid black' }}>
      <Form onSubmit={(e) => createSwap(e)} className='mx-2'>
        {/* Asset to be swapped */}
        <Form.Text className='float-end mx-1'>Balance: {tradeAssetBalance}</Form.Text>
        <InputGroup className='mt-1 mb-4'>
          <DropdownButton id='trade_asset' title='Select Asset' variant='outline-secondary' onSelect={(e) => tradeAssetSelected(e)}>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_ATLAS_MINT}>Atlas</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_POLIS_MINT}>Polis</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_AMMO_MINT}>Ammo</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_FOOD_MINT}>Food</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_FUEL_MINT}>Fuel</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_TOOLKITS_MINT}>Toolkits</Dropdown.Item>
          </DropdownButton>
          <Form.Control type='number' placeholder='Amount to send' onChange={(e) => setTradeAssetAmount(e.target.value)}></Form.Control>
          <Button variant='outline-secondary'>Max</Button>
        </InputGroup>

        <hr className='create_swap_hr' />

        {/* Address to swap with */}
        <Form.Control className='mt-4 mb-3' type='text' placeholder='Address of swap partner' value={partnerAddress} onChange={(e) => setPartnerAddress(e.target.value)}></Form.Control>

        {/* Asset to swap for */}
        <Form.Text className='float-end mx-1 my-0'>Balance: {tradeForAssetBalance}</Form.Text>
        <InputGroup className='mt-1 mb-4'>
          <DropdownButton id='trade_for_asset' title='Select Asset' variant='outline-secondary' onSelect={(e) => tradeForAssetSelected(e)} required>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_ATLAS_MINT}>Atlas</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_POLIS_MINT}>Polis</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_AMMO_MINT}>Ammo</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_FOOD_MINT}>Food</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_FUEL_MINT}>Fuel</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_TOOLKITS_MINT}>Toolkits</Dropdown.Item>
          </DropdownButton>
          <Form.Control type='number' placeholder='Amount to receive' onChange={(e) => setTradeForAssetAmount(e.target.value)}></Form.Control>
        </InputGroup>

        <Button type='submit' className='maroon_bg mb-4 submit_button'>Create Swap</Button>
      </Form>
    </div>
  )
}

export default SwapsCreate
