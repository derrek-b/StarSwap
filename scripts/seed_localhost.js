import { airdropIfRequired } from '@solana-developers/helpers'
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import { getKeypairFromEnvironment } from '@solana-developers/helpers'
import 'dotenv/config'
const { createHash } = require('crypto')
const BN = require('bn.js');

import { Escrow } from '../src/app/classes/Escrow'

console.log('Starting script...')

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

const atlasKeypair = getKeypairFromEnvironment('NEXT_PUBLIC_ATLAS_SECRET_KEY_ON_LOCALHOST')
const [ mAtlasMint, mAtlasATAWallet, mAtlasATARando ] = await createTokenAndAccounts(connection, wallet, rando, 8, atlasKeypair)
console.log('Atlas minted...', mAtlasMint.toString())

const polisKeypair = getKeypairFromEnvironment('NEXT_PUBLIC_POLIS_SECRET_KEY_ON_LOCALHOST')
const [ mPolisMint, mPolisATAWallet, mPolisATARando ] = await createTokenAndAccounts(connection, wallet, rando, 8, polisKeypair)
console.log('Polis minted...', mPolisMint.toString())

const foodKeypair = getKeypairFromEnvironment('NEXT_PUBLIC_FOOD_SECRET_KEY_ON_LOCALHOST')
const [ mFoodMint, mFoodATAWallet, mFoodATARando ] = await createTokenAndAccounts(connection, wallet, rando, 0, foodKeypair)
console.log('Food minted...', mFoodMint.toString())

const fuelKeypair = getKeypairFromEnvironment('NEXT_PUBLIC_FUEL_SECRET_KEY_ON_LOCALHOST')
const [ mFuelMint, mFuelATAWallet, mFuelATARando ] = await createTokenAndAccounts(connection, wallet, rando, 0, fuelKeypair)
console.log('Fuel minted...', mFuelMint.toString())

console.log('Tokens minted.')
console.log('Creating trades...')

// submit new trades created by cli wallet
await createTrade(connection, wallet, mAtlasMint, mAtlasATAWallet, mFoodATAWallet, 100, rando, mFoodMint, 100)
await createTrade(connection, wallet, mAtlasMint, mAtlasATAWallet, mFuelATAWallet, 200, rando, mFuelMint, 200)

// submit new trades created by rando wallet
await createTrade(connection, rando, mPolisMint, mPolisATARando, mFoodATARando, 300, wallet, mFoodMint, 300)
await createTrade(connection, rando, mPolisMint, mPolisATARando, mFuelATARando, 400, wallet, mFuelMint, 400)

console.log('Trades created.')

console.log('Script finished!')

// function to create new trade
async function createTrade(connection, user, userAsset, userAssetATA, userReceivingAssetATA, userAssetAmount, partner, partnerAsset, partnerAssetAmount) {
  const partnerAssetDecimals = (await connection.getParsedAccountInfo(partnerAsset)).value.data.parsed.info.decimals
  const amount = partnerAssetDecimals === 0 ? partnerAssetAmount : partnerAssetAmount * 10 ** partnerAssetDecimals
  const u64Amount = new BN(amount, 'le')
  const trade = new Escrow(
    partner.publicKey.toString(),
    u64Amount,
  )
  const buffer = trade.serialize()

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

  // Set up for transaction creation
  const tempAccount = web3.Keypair.generate()
  const mint = await token.getMint(connection, userAsset)
  const space = token.getAccountLenForMint(mint)
  const lamports = await connection.getMinimumBalanceForRentExemption(space)
  const tempTA = await token.getAssociatedTokenAddress(userAsset, tempAccount.publicKey, false)

  // Create temp account instruction
  const tempAccountIx = web3.SystemProgram.createAccount({
      fromPubkey: user.publicKey,
      newAccountPubkey: tempAccount.publicKey,
      space,
      lamports,
      programId: token.TOKEN_PROGRAM_ID,
  })

  // Create temp ATA instruction
  const tempTAIx = token.createAssociatedTokenAccountInstruction(
    user.publicKey,
    tempTA,
    tempAccount.publicKey,
    userAsset,
  )

  // Create transfer instruction
  const userAssetDecimals = (await connection.getParsedAccountInfo(userAsset)).value.data.parsed.info.decimals

  const transferIx = token.createTransferInstruction(
    userAssetATA,
    tempTA,
    user.publicKey,
    userAssetDecimals === 0 ? userAssetAmount : userAssetAmount * 10 ** userAssetDecimals,
  )

  // Create escrow instruction
  const createEscrowIx = new web3.TransactionInstruction({
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

  console.log('instructions created...')

  try {
    tx.add(tempAccountIx, tempTAIx, transferIx, createEscrowIx, changeOwnerIx)
    tx.add(web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 300000}))
    const txSig = await web3.sendAndConfirmTransaction(connection, tx, [user, tempAccount])

    console.log('trade created', txSig)
  } catch (e) {
    console.log(JSON.stringify(e))
  }
}

// function to create tokens and accounts
async function createTokenAndAccounts(connection, wallet, rando, decimals, keypair) {
  // Create token mint
  const mint = await token.createMint(
    connection,
    rando,
    rando.publicKey,
    rando.publicKey,
    decimals,
    keypair
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
