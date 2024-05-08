import { airdropIfRequired } from '@solana-developers/helpers'
import * as web3 from '@solana/web3.js'
import { getKeypairFromEnvironment } from '@solana-developers/helpers'
import 'dotenv/config'
const { createHash } = require('crypto')

import { Trade } from '../src/app/classes/Trade'

// generate new keypair & pubkey for cli wallet
const rando = web3.Keypair.generate()
const randoKey = rando.publicKey.toBase58()

const wallet = getKeypairFromEnvironment('NEXT_PUBLIC_SECRET_KEY_ONLY_PHANTOM_ON_CLI')
const walletKey = wallet.publicKey.toBase58()

// connect to localhost
const connection = new web3.Connection('http://127.0.0.1:8899')

await airdropIfRequired(
  connection,
  rando.publicKey,
  100 * web3.LAMPORTS_PER_SOL,
  1 * web3.LAMPORTS_PER_SOL,
)

await airdropIfRequired(
  connection,
  wallet.publicKey,
  100 * web3.LAMPORTS_PER_SOL,
  1 * web3.LAMPORTS_PER_SOL,
)


// submit new trades created by new key pair
createTrade(randoKey, process.env.NEXT_PUBLIC_ATLAS_MINT, 1, walletKey, process.env.NEXT_PUBLIC_AMMO_MINT, 1, rando)
createTrade(randoKey, process.env.NEXT_PUBLIC_FOOD_MINT, 2, walletKey, process.env.NEXT_PUBLIC_FUEL_MINT, 2, rando)

// submit trades created by phantom address on solana cli
createTrade(walletKey, process.env.NEXT_PUBLIC_ATLAS_MINT, 3, randoKey, process.env.NEXT_PUBLIC_AMMO_MINT, 3, wallet)
createTrade(walletKey, process.env.NEXT_PUBLIC_FOOD_MINT, 4, randoKey, process.env.NEXT_PUBLIC_FUEL_MINT, 4, wallet)


// function to create new trade
async function createTrade(trader1, asset1, asset1Amount, trader2, asset2, asset2Amount, signer){
  const trade = new Trade(
    trader1,
    asset1,
    asset1Amount,
    trader2,
    asset2,
    asset2Amount,
  )
  const buffer = trade.serialize()

  const tx = new web3.Transaction()
  const hash = createHash('sha256').update(trader1 + asset1 + trader2 + asset2).digest('hex')

  const [pda] = await web3.PublicKey.findProgramAddressSync(
    [Buffer.from(hash.substring(0,32))],
    new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
  )

  const inst = new web3.TransactionInstruction({
    keys: [
      {
        pubkey: signer.publicKey,
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

  try {
    const txSig = await web3.sendAndConfirmTransaction(connection, tx, [signer])
    console.log('trade created', txSig)
  } catch (e) {
    console.log(JSON.stringify(e))
  }

  console.log('FINITO!')
}
