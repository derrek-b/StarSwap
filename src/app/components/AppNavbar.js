// Dependencies
import "@total-typescript/ts-reset";
import { useEffect, useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
require('dotenv').config()

// Components
import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'
import Image from 'next/image'

const AppNavbar = () => {
  const [isClient, setIsClient] = useState(false)
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState(0)
  const [atlas, setAtlas] = useState(0.00)

  const getBalance = async () => {
    if(publicKey && connection) {
      connection.getBalance(publicKey).then((info) => setBalance(info / web3.LAMPORTS_PER_SOL))
    }
  }

  const getAtlasBalance = async () => {
    const atlasMintAddress = new web3.PublicKey(process.env.NEXT_PUBLIC_ATLAS_MINT)

    const userAtlasATA = await token.getAssociatedTokenAddress(
      atlasMintAddress,
      publicKey,
    )

    try {
      console.log('trying...')
      const info = await token.getAccount(connection, userAtlasATA)
      const mint = await token.getMint(connection, info.mint)
      setAtlas(Number(info.amount) / (10 ** mint.decimals))
    }catch {
      console.log('catching...')
      setAtlas(null)
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if(publicKey && connection) {
      getBalance()
      getAtlasBalance()
    }
  }, [publicKey])

  return (
    <Navbar className='mx-2 my-0 pt-3'>
      <Navbar.Brand>
        <span className='brand maroon align-middle' >Mos Eisley</span>
      </Navbar.Brand>

      <Nav>
        <Nav.Link className='nav mt-3' >Flea Market</Nav.Link>
        <Nav.Link className='nav mt-3' >Order Book</Nav.Link>
      </Nav>

      <Navbar.Collapse className='justify-content-end'>
        <span>Sol Balance:
          {publicKey ? (
            balance
          ) : (
            '0.00'
          )}
          Atlas Balance:
          {publicKey && atlas ? (
            atlas
          ) : (
            '0.00\n'
          )}
          {isClient ? (
              <WalletMultiButton style={{ backgroundColor: 'rgb(133,2,2)' }} />
          ) : (
            ''
          )}
        </span>
      </Navbar.Collapse>
    </Navbar>
  )
}

export default AppNavbar
