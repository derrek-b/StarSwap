import { airdropIfRequired } from '@solana-developers/helpers'
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import { getKeypairFromEnvironment } from '@solana-developers/helpers'
import 'dotenv/config'
const { createHash } = require('crypto')

import { Trade } from '../src/app/classes/Trade'

console.log('Starting script...')

// generate new keypair & pubkey for cli wallet
//let mAtlasMint, mAtlasATAWallet, mAtlasATARando
// let mPolisMint, mPolisATAWallet, mPolisATARando
// let mFoodMint, mFoodATAWallet, mFoodATARando
// let mFuelMint, mFuelATAWallet, mFuelATARando

const rando = web3.Keypair.generate()
const randoKey = rando.publicKey.toBase58()

const wallet = getKeypairFromEnvironment('NEXT_PUBLIC_SECRET_KEY_ONLY_PHANTOM_ON_CLI')
const walletKey = wallet.publicKey.toBase58()

// connect to localhost
const connection = new web3.Connection('http://127.0.0.1:8899')

// Airdrops for signers
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

console.log('Minting tokens...')

const [ mAtlasMint, mAtlasATAWallet, mAtlasATARando ] = await createTokenAndAccounts(connection, wallet, rando, 8)
console.log('Atlas minted...')

//const [ mPolisMint, mPolisATAWallet, mPolisATARando ] = await createTokenAndAccounts(connection, wallet, rando, 8)
//console.log('Polis minted...')

const [ mFoodMint, mFoodATAWallet, mFoodATARando ] = await createTokenAndAccounts(connection, wallet, rando, 0)
console.log('Food minted...')

//const [ mFuelMint, mFuelATAWallet, mFuelATARando ] = await createTokenAndAccounts(connection, wallet, rando, 0)
//console.log('Fuel minted...')

console.log('Tokens minted.')
console.log('Creating trades...')

// submit new trades created by cli wallet
await createTrade(connection, wallet, mAtlasMint, mAtlasATAWallet, 100, rando, mFoodMint, 100)

// console.log('Trades created.')

console.log('Script finished!')

// function to create new trade
async function createTrade(connection, user, userAsset, userAssetATA, userAssetAmount, partner, partnerAsset, partnerAssetAmount) {
  // 1. [x] create temp token account for creator
  // 2. [x] send creator asset to temp account
  // 3. [x] create escrow account and partner pda via program
  // 4. [x] transfer ownership of temp account to escrow pda

  const decimals = (await connection.getParsedAccountInfo(partnerAsset)).value.data.parsed.info.decimals
  const trade = new Trade(
    partner.publicKey.toString(),
    decimals === 0 ? partnerAssetAmount : partnerAsset * 10 ** decimals, //Error will be here because Trade is expecting a u64**********
  )
  const buffer = trade.serialize()
  console.log('trade serialized...')

  const tx = new web3.Transaction()

  // Create escrow PDA account
  let escrowHash = createHash('sha256').update(user.publicKey + partner.publicKey + userAsset + partnerAsset).digest('hex')
  const [escrowPDA] = await web3.PublicKey.findProgramAddressSync(
    [Buffer.from(escrowHash.substring(0, 32))],
    new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
  )

  // Create partner PDA account
  let partnerHash = createHash('sha256').update(escrowHash + partner.publicKey).digest('hex')
  const [partnerPda] = await web3.PublicKey.findProgramAddressSync(
    [Buffer.from(partnerHash.substring(0, 32))],
    new web3.PublicKey(process.env.NEXT_PUBLIC_LOCALHOST_PROGRAM_ID),
  )
  console.log('PDAs created...')

  try {
    // Create temp token account to store user's asset
    const tempTA = await token.createAccount(
      connection,
      user,
      mAtlasMint,
      user.publicKey,
      web3.Keypair.generate()
    )
    console.log('tempTA created...')

    // Transfer tokens from wallet ATA to wallet TA
    const txSigFundTempTA = await token.transfer(
      connection,
      user,
      userAssetATA,
      tempTA,
      user.publicKey,
      decimals === 0 ? userAssetAmount : userAsset * 10 ** decimals,
    )
    console.log('tempTA funded...')

    // Create escrow and partner PDAs via program
    const inst = new web3.TransactionInstruction({
      keys: [
        {
          pubkey: user.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: tempTA,
          isSigner: false,
          isWritable: false,  //becomes writable if transfer of ownership is moved inside solana program
        },
        {
          pubkey: userAssetATA,
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
    console.log('instruction created...')
    tx.add(inst)
    console.log('sending transaction...')
    const txSig = await web3.sendAndConfirmTransaction(connection, tx, [user],)
    console.log('Escrow created...')

    // Transfer ownership of temp TA
    const txSigSetNewAuth = await token.setAuthority(
      connection,
      user,
      tempTA,
      user.publicKey,
      token.AuthorityType.AccountOwner,
      escrowPDA,
    )
    console.log('ownership transferred...')
    console.log('trade created', txSig)
  } catch (e) {
    alert(e)
    console.log(JSON.stringify(e))
  }
}

// function to create tokens and accounts
async function createTokenAndAccounts(connection, wallet, rando, decimals) {
  // Create token mint
  const mint = await token.createMint(
    connection,
    rando,
    rando.publicKey,
    rando.publicKey,
    decimals,
  )

  // Create ATAs for wallet and rando accounts
  // Wallet
  const ATAWallet = await token.createAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey,
  )

  // Rando
  const ATARando = await token.createAssociatedTokenAccount(
    connection,
    rando,
    mint,
    rando.publicKey,
  )

  // Mint 1000 assets into both ATA accounts
  // Wallet
  const txsigWallet = await token.mintTo(
    connection,
    wallet,
    mint,
    ATAWallet,
    rando,
    decimals === 0 ? 1000 : 1000 * 10 ** decimals,
  )

  // Rando
  const txsigRando = await token.mintTo(
    connection,
    rando,
    mint,
    ATARando,
    rando,
    decimals === 0 ? 1000 : 1000 * 10 ** decimals,
  )

  return [ mint, ATAWallet, ATARando ]

}
