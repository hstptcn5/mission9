import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import MuseumScene from './pages/MuseumScene'
import WalletConnect from './components/WalletConnect'
import BadgeInventory from './components/BadgeInventory'
import { useQuestStore } from './store/questStore'
import './App.css'

function AppShell({ children, walletConnected, walletAddress, onConnect, onDisconnect }) {
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const badges = useQuestStore((state) => state.badges)

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-[#05012a] overflow-hidden">
      <header className="bg-black/25 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                🎨 Chog's Immersive Gallery
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setInventoryOpen((prev) => !prev)}
              className="rounded-xl border border-white/25 bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25 transition"
            >
              Badge Kit ({badges.length})
            </button>
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

      <BadgeInventory open={inventoryOpen} onClose={() => setInventoryOpen(false)} badgeIds={badges} />
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

