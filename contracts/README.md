# Chog Art Badge NFT Contract

ERC-721 NFT contract for minting Chog Art Badges when users collect dApp portraits in Chog's Art Gallery Quest.

## 📋 Prerequisites

1. Node.js 18+
2. Hardhat
3. Testnet tokens (get from Monad faucet)
4. Private key with testnet tokens

## 🚀 Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and add your private key
# Get testnet tokens from Monad faucet
```

## 🔨 Compile

```bash
npm run compile
```

## 🧪 Test

```bash
npm test
```

## 🚢 Deploy to Monad Testnet

1. **Get testnet tokens**: Request from Monad testnet faucet
2. **Set up .env**: Add your `PRIVATE_KEY` and `MONAD_RPC_URL`
3. **Deploy**:

```bash
npm run deploy:testnet
```

After deployment, you'll get:
- Contract address
- Deployment transaction hash
- Verification status

## 📝 Update Frontend

After deployment, update `src/utils/nftMinting.js`:

```javascript
const NFT_CONTRACT_ADDRESS = '0x...' // Your deployed contract address
```

## 🔍 Contract Functions

### Public Functions

- `mint(address to, string dappId, string tokenURI)` - Mint a new badge
- `batchMint(address[] recipients, string[] dappIds, string[] tokenURIs)` - Batch mint
- `totalSupply()` - Get total number of minted tokens
- `getDappTokenCount(string dappId)` - Get count of badges for a dApp
- `getDappId(uint256 tokenId)` - Get dApp ID for a token

### Owner Functions

- `setBaseURI(string baseURI)` - Update base URI for metadata

## 📦 Contract Details

- **Name**: Chog Art Badge
- **Symbol**: CHOG
- **Standard**: ERC-721
- **Network**: Monad Testnet
- **OpenZeppelin**: Uses OpenZeppelin contracts for security

## 🔐 Security

- Uses OpenZeppelin's battle-tested contracts
- Owner-only functions for sensitive operations
- Input validation on all public functions

## 📚 Resources

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Monad Documentation](https://docs.monad.xyz)

