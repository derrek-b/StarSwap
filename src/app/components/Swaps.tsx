// Dependencies
import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as web3 from '@solana/web3.js'

// Components
import Nav from 'react-bootstrap/Nav'
import SwapsCreate from './SwapsCreate'
import MySwaps from './MySwaps'

const Swaps = () => {
  return (
    <div className='mx-auto' style={{ width: '600px' }}>
      <Nav>
        <Nav.Link>Create Swap</Nav.Link>
        <Nav.Link>Open Swaps</Nav.Link>
      </Nav>

      <SwapsCreate style={{ width: '600px', border: '1px solid black' }}/>

      <MySwaps />
    </div>
  )
}

export default Swaps
