'use client'

// Components
import WalletContextProvider from "./components/WalletContextProvider"
import AppNavbar from './components/AppNavbar'
import Swaps from './components/Swaps'

export default function Home() {
  return (
    <WalletContextProvider>
      <AppNavbar />
      <hr />
      <Swaps />
    </WalletContextProvider>
  );
}
