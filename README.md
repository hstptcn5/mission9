# 🎨 Chog's Art Gallery Quest

An immersive art gallery for discovering Monad dApps, featuring Chog (Monad's gentle mascot) as the central character. This project transforms the discovery layer into an artistic experience where users can vote, collect, and unlock hidden gems through quests.

## 🌟 Features

- **Immersive Art Generation**: AI-generated abstract art portraits for each dApp based on on-chain data (TVL, users)
- **Social Voting**: Vote for dApps via Farcaster integration
- **Quest System**: Complete quests to unlock glitch reveals and hidden dApps
- **NFT Collection**: Mint "Chog Art Badges" when collecting dApp portraits
- **Glitch Reveal Mechanic**: Unlock hidden gems (like DRKVRS) through quest completion
- **Smart Recommendations**: Get personalized dApp recommendations based on voting patterns

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- MetaMask or compatible Web3 wallet
- Monad testnet RPC access

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:3000`

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Art Generation**: p5.js + react-p5
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Blockchain**: ethers.js v6
- **Social**: Farcaster SDK (hub-nodejs)
- **Animations**: Framer Motion
- **Deployment**: Vercel/Netlify

## 📁 Project Structure

```
chog-art-gallery-quest/
├── src/
│   ├── components/
│   │   ├── ArtPortrait.jsx      # p5.js art generation component
│   │   ├── Gallery.jsx           # Main gallery view
│   │   ├── QuestTracker.jsx     # Quest progress tracker
│   │   └── WalletConnect.jsx    # Wallet connection UI
│   ├── store/
│   │   └── questStore.js         # Zustand state management
│   ├── utils/
│   │   ├── monadRPC.js          # Monad RPC queries
│   │   ├── dappsData.js         # dApp ecosystem data
│   │   ├── farcaster.js         # Farcaster integration
│   │   └── nftMinting.js        # NFT minting utilities
│   ├── App.jsx                   # Main app component
│   └── main.jsx                  # Entry point
├── package.json
├── vite.config.js
└── README.md
```

## 🎮 How to Use

1. **Connect Wallet**: Click "Connect Wallet" to connect your MetaMask
2. **Explore Gallery**: Browse dApp art portraits in the gallery
3. **Vote**: Click "Vote" on dApps you like (requires wallet connection)
4. **Collect**: Click "Collect" to mint a Chog Art Badge NFT
5. **Complete Quests**: 
   - Vote 3 times → Unlock glitch reveal mechanic
   - Collect 5 dApps → Unlock full recommendations feed
6. **Discover Hidden Gems**: After unlocking glitch, hover over portraits to reveal hidden dApps

## 🔧 Configuration

### Monad Testnet RPC

The app uses Monad testnet RPC by default:
```
https://monad-testnet-rpc.monad.xyz
```

### Farcaster Integration

To enable full Farcaster features, you'll need:
- Farcaster Hub access
- User FID (Farcaster ID)
- Warpcast sign-in integration

Currently, the app uses a simplified client-side version. Full integration requires server-side setup.

### NFT Contract

Deploy an ERC-721 contract on Monad testnet and update `NFT_CONTRACT_ADDRESS` in `src/utils/nftMinting.js`.

## 🎨 Art Generation

Art portraits are generated using p5.js based on:
- **TVL**: Maps to color hue (purple-blue range)
- **Users**: Determines stroke count and complexity
- **Category**: Influences artistic style

The art is generated in real-time when viewing each dApp portrait.

## 📝 Development Notes

### Adding New dApps

Edit `src/utils/dappsData.js` to add new dApps to the ecosystem:

```javascript
{
  id: 'new-dapp',
  name: 'New dApp',
  category: 'DeFi',
  description: 'Description here',
  url: 'https://newdapp.com',
  contractAddress: '0x...',
  votes: 0,
  hidden: false, // Set to true for hidden gems
}
```

### Customizing Art Generation

Modify the `generateArt` function in `src/components/ArtPortrait.jsx` to change how art is generated from dApp data.

## 🚢 Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Netlify

```bash
# Build first
npm run build

# Deploy dist/ folder to Netlify
```

## 🤝 Collaboration

This project is built for Monad Mission 9. For collaboration with @ChogNFT:

1. Create demo GIF/video
2. Tag @ChogNFT on X/Twitter
3. Share GitHub link

## 📄 License

MIT License - Open Source

## 🙏 Credits

- **Chog**: Monad's gentle mascot (@ChogNFT)
- **Monad**: The blockchain platform
- **Community**: All Monad developers and artists

## 🔮 Future Enhancements

- [ ] Full Farcaster server-side integration
- [ ] 3D gallery view with Three.js
- [ ] Voice interactions with Chog
- [ ] Advanced AI art generation (ML5.js StyleTransfer)
- [ ] Multi-chain support
- [ ] Social sharing features
- [ ] Leaderboard system

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Contact: [Your contact info]

---

Built with ❤️ for Monad Mission 9

**#MonadMission9** 🚀

