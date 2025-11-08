import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Gallery from './components/Gallery'
import Gallery3D from './pages/Gallery3D'
import MuseumScene from './pages/MuseumScene'
import WalletConnect from './components/WalletConnect'
import './App.css'

function HeaderNav() {
  const location = useLocation()
  const navItems = [
    { label: '2D Gallery', to: '/' },
    { label: '3D Carousel', to: '/3d' },
    { label: 'Museum (beta)', to: '/museum' },
  ]

  return (
    <nav className="flex items-center gap-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition ${
              isActive
                ? 'bg-white/20 border-white/40 text-white shadow-inner'
                : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/15 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function AppShell({ children, walletConnected, walletAddress, onConnect, onDisconnect }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-[#05012a]">
      <header className="bg-black/25 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                🎨 Chog's Art Gallery Quest
              </h1>
              <span className="text-sm text-white/60">
                "Gentle soul discovering Monad dApps"
              </span>
            </div>
            <HeaderNav />
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

      <footer className="bg-black/30 backdrop-blur-md border-t border-white/10 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-white/70">
          <p>
            Built for Monad Mission 9 •{' '}
            <a
              href="https://github.com"
              className="underline hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Source MIT
            </a>
            {' • '}
            <a
              href="https://x.com/ChogNFT"
              className="underline hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              @ChogNFT
            </a>
          </p>
        </div>
      </footer>
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
              <Gallery walletConnected={walletConnected} walletAddress={walletAddress} />
            </AppShell>
          }
        />
        <Route
          path="/3d"
          element={
            <AppShell
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            >
              <Gallery3D walletConnected={walletConnected} walletAddress={walletAddress} />
            </AppShell>
          }
        />
        <Route
          path="/museum"
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
      </Routes>
    </Router>
  )
}

export default App

