// Dependencies
import { FC, ReactNode, useMemo } from "react"
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import * as web3 from "@solana/web3.js"

// Styles
require("@solana/wallet-adapter-react-ui/styles.css")

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // const network = WalletAdapterNetwork.Devnet
  // const endpoint = useMemo(() => web3.clusterApiUrl("devnet"), [network])
  const endpoint = 'https://wild-stylish-energy.solana-mainnet.quiknode.pro/d0c3b02390d0ae3a4ce6cce3c359186c43c27880/'
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletContextProvider
