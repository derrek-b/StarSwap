// Dependencies
import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
require('dotenv').config()

// Components
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Button from 'react-bootstrap/Button'


const SwapsCreate = () => {
  const { publicKey } = useWallet()
  const {connection } = useConnection()

  const [tradeAsset, setTradeAsset] = useState(null)
  const [tradeAssetBalance, setTradeAssetBalance] = useState(0)
  const [tradeForAsset, setTradeForAsset] = useState(null)
  const [tradeForAssetBalance, setTradeForAssetBalance] = useState(0)
  const [partnerAddress, setPartnerAddress] = useState(null)

  const createSwap = (e) => {
    e.preventDefault()
    console.log('creating swap...')
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

    // !!!!!!!!!!!!! TODO: FETCH BALANCE OF SELECTED ASSET HELD BUY TRADE PARTNER IN WALLET OF ADDRESS ENTERED !!!!!!!!!!!!!!!
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

  const setDDButtonTest = (e, button) => {
    switch (e) {
      case process.env.NEXT_PUBLIC_ATLAS_MINT:
        button.textContent = 'Atlas'
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
    // [X] Asset to swap
    // [X] Asset to swap for
    // [X] Address to swap with
    // [ ] Time until swap cancel
    <div>
      <Form onSubmit={(e) => createSwap(e)} className='mx-2'>
        {/* Asset to be swapped */}
        <Form.Text className='float-end mx-1'>Balance: {tradeAssetBalance}</Form.Text>
        <InputGroup className='mt-1 mb-4'>
          <DropdownButton id='trade_asset' title='Select Asset' variant='outline-secondary' onSelect={(e) => tradeAssetSelected(e)}>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_ATLAS_MINT}>Atlas</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_AMMO_MINT}>Ammo</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_FOOD_MINT}>Food</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_FUEL_MINT}>Fuel</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_TOOLKITS_MINT}>Toolkits</Dropdown.Item>
          </DropdownButton>
          <Form.Control type='number' placeholder='Amount to send'></Form.Control>
          <Button variant='outline-secondary'>Max</Button>
        </InputGroup>

        <hr className='create_swap_hr' />

        {/* Address to swap with */}
        <Form.Control className='mt-4 mb-3' type='text' placeholder='Address of swap partner' onChange={(e) => setPartnerAddress(e.target.value)}></Form.Control>

        {/* Asset to swap for */}
        <Form.Text className='float-end mx-1 my-0'>Balance: {tradeForAssetBalance}</Form.Text>
        <InputGroup className='mt-1 mb-3'>
          <DropdownButton id='trade_for_asset' title='Select Asset' variant='outline-secondary' onSelect={(e) => tradeForAssetSelected(e)} required>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_ATLAS_MINT}>Atlas</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_AMMO_MINT}>Ammo</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_FOOD_MINT}>Food</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_FUEL_MINT}>Fuel</Dropdown.Item>
            <Dropdown.Item eventKey={process.env.NEXT_PUBLIC_TOOLKITS_MINT}>Toolkits</Dropdown.Item>
          </DropdownButton>
          <Form.Control type='number' placeholder='Amount to receive'></Form.Control>
        </InputGroup>

        <Button type='submit' className='maroon_bg mb-3'>Create Swap</Button>
      </Form>
    </div>
  )
}

export default SwapsCreate
