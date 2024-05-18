// Dependencies
//import { getKeypairFromEnvironment } from '@solana-developers/helpers' // localhost only
import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import * as borsh from '@project-serum/borsh'
import { sha256 } from 'crypto-hash'
import config from '../config.json'
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

  const [userAsset, setUserAsset] = useState(null)
  const [userAssetAmount, setUserAssetAmount] = useState()
  const [userAssetBalance, setUserAssetBalance] = useState(0)
  const [partnerAsset, setPartnerAsset] = useState(null)
  const [partnerAssetAmount, setPartnerAssetAmount] = useState()
  const [partnerAssetBalance, setPartnerAssetBalance] = useState(0)
  const [partnerAddress, setPartnerAddress] = useState('')
  const [network, setNetwork] = useState('')

  const createSwap = async (e) => {
    e.preventDefault()
    const partnerAssetDecimals = (await connection.getParsedAccountInfo(partnerAsset)).value.data.parsed.info.decimals
    const amount = partnerAssetDecimals === 0 ? partnerAssetAmount : partnerAssetAmount * 10 ** partnerAssetDecimals
    const u64Amount = new BN(amount, 'le')
      const trade = new Trade(
      partner.publicKey.toString(),
      u64Amount,
    )

    const buffer = trade.serialize()

    const tx = new web3.Transaction()

    const tempAccount = web3.Keypair.generate()
    const mint = await token.getMint(connection, new web3.PublicKey(tradeAsset))
    const space = 500;
    const lamports = await connection.getMinimumBalanceForRentExemption(space);

    console.log(tempAccount, space, lamports)

    // Create temp token account to store user's asset
    const createTempAccountIx = web3.SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: tempAccount.publicKey,
        space,
        lamports,
        programId: token.TOKEN_PROGRAM_ID,
    })
    console.log('create account instruction created...')

    tx.add(createTempAccountIx)

    //console.log('transaction created...')

    try {
      const txSig = await web3.sendAndConfirmTransaction(connection, tx, [keypair, tempAccount]) // localhost
      //const txSig = await sendTransaction(tx, connection, { signers: [tempAccount] }) // devnet and prod
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

  useEffect(() => {
    if (connection.rpcEndpoint === 'http://127.0.0.1:8899') {
      console.log('connected to localhost')
      setNetwork('localhost')
    }
  }, [])

  return (
    <div style={{ width: '600px', border: '1px solid black' }}>
      {console.log('network', config[network].atlasMint)}
      <Form onSubmit={(e) => createSwap(e)} className='mx-2'>
        {/* Asset to be swapped */}
        <Form.Text className='float-end mx-1'>Balance: {tradeAssetBalance}</Form.Text>
        <InputGroup className='mt-1 mb-4'>
          <DropdownButton id='trade_asset' title='Select Asset' variant='outline-secondary' onSelect={(e) => tradeAssetSelected(e)}>
            <Dropdown.Item eventKey={config[network].atlasMint}>Atlas</Dropdown.Item>
            <Dropdown.Item eventKey={config[network].polisMint}>Polis</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_AMMO_MINT}>Ammo</Dropdown.Item>
            <Dropdown.Item eventKey={config[network].foodMint}>Food</Dropdown.Item>
            <Dropdown.Item eventKey={config[network].fuelMint}>Fuel</Dropdown.Item>
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
