import { useState } from 'react'
import { getProvider } from '../utils/monadRPC'

export default function WalletConnect({
  walletConnected,
  walletAddress,
  onConnect,
  onDisconnect,
}) {
  const [connecting, setConnecting] = useState(false)

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet!')
      return
    }

    setConnecting(true)
    try {
      const provider = getProvider()
      const accounts = await provider.send('eth_requestAccounts', [])
      if (accounts.length > 0) {
        onConnect(accounts[0])
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  const disconnectWallet = () => {
    onDisconnect()
  }

  return (
    <div className="flex items-center gap-2">
      {walletConnected ? (
        <>
          <span className="text-white text-sm bg-green-500/30 px-3 py-1 rounded">
            {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </span>
          <button
            onClick={disconnectWallet}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
          >
            Disconnect
          </button>
        </>
      ) : (
        <button
          onClick={connectWallet}
          disabled={connecting}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}

