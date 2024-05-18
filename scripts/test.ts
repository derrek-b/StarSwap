import {
  SystemProgram,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as token from '@solana/spl-token'

(async () => {

const connection = new Connection('http://127.0.0.1:8899')
  const fromPubkey = Keypair.generate();
  console.log('2')

  // Airdrop SOL for transferring lamports to the created account
  const airdropSignature = await connection.requestAirdrop(
    fromPubkey.publicKey,
    LAMPORTS_PER_SOL,
  );
  await connection.confirmTransaction(airdropSignature);
  console.log('3')

  // amount of space to reserve for the account
  const space = 0;

  // Seed the created account with lamports for rent exemption
  const rentExemptionAmount =
    await connection.getMinimumBalanceForRentExemption(space);
    console.log('4')

  const newAccountPubkey = Keypair.generate();
  const createAccountParams = {
    fromPubkey: fromPubkey.publicKey,
    newAccountPubkey: newAccountPubkey.publicKey,
    lamports: rentExemptionAmount,
    space,
    programId: token.TOKEN_PROGRAM_ID,
  };
  console.log('5')

  const createAccountTransaction = new Transaction().add(
    SystemProgram.createAccount(createAccountParams),
  );
  console.log('6')

  const tx = await sendAndConfirmTransaction(connection, createAccountTransaction, [
    fromPubkey,
    newAccountPubkey,
  ]);

  console.log(tx)
})();
