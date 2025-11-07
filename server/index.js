// Optional backend server for Farcaster integration
// Run with: npm run server

import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chog Art Gallery Quest API' })
})

// Farcaster vote endpoint (placeholder)
app.post('/api/vote', async (req, res) => {
  try {
    const { walletAddress, dappId } = req.body
    
    // TODO: Implement Farcaster Hub integration
    // const hub = new Hub('https://hub.farcaster.xyz')
    // await hub.submitReaction({ ... })
    
    res.json({ 
      success: true, 
      message: `Vote recorded for ${dappId}` 
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Get recommendations endpoint
app.get('/api/recommendations/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params
    
    // TODO: Query Farcaster for friend votes
    // Return recommended dApps based on social graph
    
    res.json({ 
      recommendations: [] 
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Chog Art Gallery Quest API running on port ${PORT}`)
})

