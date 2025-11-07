import { useState, useEffect } from 'react'
import ArtPortrait from './ArtPortrait'
import { getDappsByCategory, getHiddenDapps, categories } from '../utils/dappsData'
import { fetchDappData } from '../utils/monadRPC'
import { useQuestStore } from '../store/questStore'
import { voteDapp, collectDapp } from '../utils/farcaster'

export default function Gallery({ walletConnected, walletAddress }) {
  const [dapps, setDapps] = useState([])
  const [hiddenDapps, setHiddenDapps] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const { addVote, addCollection, questProgress } = useQuestStore()

  useEffect(() => {
    loadDapps()
  }, [selectedCategory])

  useEffect(() => {
    // Show hidden dapps when glitch is unlocked
    if (questProgress.glitchUnlocked) {
      loadHiddenDapps()
    }
  }, [questProgress.glitchUnlocked])

  const loadDapps = async () => {
    setLoading(true)
    try {
      const dappsList = getDappsByCategory(selectedCategory)
      const dappsWithData = await Promise.all(
        dappsList.map(dapp => fetchDappData(dapp))
      )
      setDapps(dappsWithData)
    } catch (error) {
      console.error('Error loading dapps:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHiddenDapps = async () => {
    try {
      const hidden = getHiddenDapps()
      const hiddenWithData = await Promise.all(
        hidden.map(dapp => fetchDappData(dapp))
      )
      setHiddenDapps(hiddenWithData)
    } catch (error) {
      console.error('Error loading hidden dapps:', error)
    }
  }

  const handleVote = async (dappId) => {
    try {
      // Add vote to local state
      addVote(dappId)
      
      // Post to Farcaster if available
      if (walletAddress) {
        await voteDapp(walletAddress, dappId)
      }
      
      // Update dApp vote count
      setDapps(prev => prev.map(d => 
        d.id === dappId ? { ...d, votes: (d.votes || 0) + 1 } : d
      ))
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  const handleCollect = async (dappId) => {
    try {
      // Add collection to local state
      addCollection(dappId)
      
      // Mint NFT if wallet connected
      if (walletConnected && walletAddress) {
        await collectDapp(walletAddress, dappId)
      }
    } catch (error) {
      console.error('Error collecting:', error)
    }
  }

  const filteredDapps = dapps.filter(dapp =>
    dapp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dapp.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-full">
      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search dApps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
            }}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat} className="bg-gray-800">
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quest Progress Banner */}
      {questProgress.votes > 0 && (
        <div className="mb-6 p-4 bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 rounded-lg">
          <p className="text-white">
            🎯 Quest Progress: {questProgress.votes} votes, {questProgress.collections} collections
            {questProgress.glitchUnlocked && ' ✨ Glitch Unlocked!'}
            {questProgress.recommendationsUnlocked && ' 🎨 Recommendations Unlocked!'}
          </p>
        </div>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-white text-xl">Loading Chog's art gallery...</p>
        </div>
      ) : (
        <>
          <div className="gallery-grid">
            {filteredDapps.map(dapp => (
              <ArtPortrait
                key={dapp.id}
                dapp={dapp}
                onVote={handleVote}
                onCollect={handleCollect}
                walletConnected={walletConnected}
              />
            ))}
          </div>

          {/* Hidden Dapps Section */}
          {questProgress.glitchUnlocked && hiddenDapps.length > 0 && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold text-white mb-6">
                ✨ Hidden Gems (Glitch Revealed)
              </h2>
              <div className="gallery-grid">
                {hiddenDapps.map(dapp => (
                  <ArtPortrait
                    key={dapp.id}
                    dapp={dapp}
                    onVote={handleVote}
                    onCollect={handleCollect}
                    walletConnected={walletConnected}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredDapps.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white text-xl">No dApps found. Try a different search!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

