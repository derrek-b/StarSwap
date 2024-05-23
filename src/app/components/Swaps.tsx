// Dependencies
import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as web3 from '@solana/web3.js'

// Components
import Nav from 'react-bootstrap/Nav'
import SwapsCreate from './SwapsCreate'
import MySwaps from './MySwaps'
import ProposedSwaps from './ProposedSwaps'

const Swaps = () => {
  return (
    <div className='mx-auto' style={{ width: '600px' }}>
      {/* <Nav>
        <Nav.Link>Create Swap</Nav.Link>
        <Nav.Link>Open Swaps</Nav.Link>
      </Nav> */}

      <SwapsCreate />

      <MySwaps />

      <ProposedSwaps />
    </div>
  )
}

export default Swaps
