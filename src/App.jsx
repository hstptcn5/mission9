import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import MuseumScene from './pages/MuseumScene'
import WalletConnect from './components/WalletConnect'
import { useQuestStore } from './store/questStore'
import './App.css'

function AppShell({ children, walletConnected, walletAddress, onConnect, onDisconnect }) {
  const setLeaderboardIdentity = useQuestStore((state) => state.setLeaderboardIdentity)

  useEffect(() => {
    if (walletConnected && walletAddress) {
      const displayName = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      setLeaderboardIdentity(walletAddress, displayName)
    } else {
      setLeaderboardIdentity(null, 'Guest Explorer')
    }
  }, [walletConnected, walletAddress, setLeaderboardIdentity])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-[#05012a] overflow-hidden">
      <header className="bg-black/25 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-6">
            <img
              src="/tittle.png"
              alt="Chog's Gallery Maze"
              className="h-16 w-auto object-contain drop-shadow-[0_6px_18px_rgba(12,10,60,0.55)]"
            />
          </div>
          <div className="flex items-center gap-4">
            <WalletConnect
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
            />
          </div>
        </div>
      </header>

      <main className="px-0 py-8">{children}</main>
    </div>
  )
}

function App() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState(null)

  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress')
    if (savedAddress) {
      setWalletAddress(savedAddress)
      setWalletConnected(true)
    }
  }, [])

  const handleConnect = (address) => {
    setWalletAddress(address)
    setWalletConnected(true)
    localStorage.setItem('walletAddress', address)
  }

  const handleDisconnect = () => {
    setWalletAddress(null)
    setWalletConnected(false)
    localStorage.removeItem('walletAddress')
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <AppShell
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            >
              <MuseumScene walletConnected={walletConnected} walletAddress={walletAddress} />
            </AppShell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App

