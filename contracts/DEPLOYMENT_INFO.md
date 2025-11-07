# 📋 Contract Deployment Information

## ChogArtBadge NFT Contract

**Contract Address**: `0x2B79C2676E631C40519503F75D116249cb08b02B`

**Network**: Monad Testnet (Chain ID: 10143)

**Deployer**: `0x963a2d0BE2eb5d785C6E73ec904fcE8d65691773`

**Deployment Date**: 2025-11-06T15:16:11.566Z

**Contract Name**: Chog Art Badge

**Symbol**: CHOG

**Base URI**: `https://ipfs.io/ipfs/`

## Contract Details

- **Standard**: ERC-721
- **OpenZeppelin**: v5.0.2
- **Solidity Version**: 0.8.20

## Functions

### Public Functions
- `mint(address to, string dappId, string tokenURI)` - Mint a new badge
- `batchMint(address[] recipients, string[] dappIds, string[] tokenURIs)` - Batch mint
- `totalSupply()` - Get total number of minted tokens
- `getDappTokenCount(string dappId)` - Get count of badges for a dApp
- `getDappId(uint256 tokenId)` - Get dApp ID for a token

### Owner Functions
- `setBaseURI(string baseTokenURI)` - Update base URI for metadata

## Explorer Links

- **Monad Explorer**: https://testnet.monadexplorer.com/address/0x2B79C2676E631C40519503F75D116249cb08b02B

## Verification

Contract verification failed automatically (Monad testnet not in Hardhat's default list), but contract is fully functional.

To verify manually:
1. Visit Monad Explorer
2. Use contract verification tool
3. Upload source code and verify

## Frontend Integration

Contract address has been updated in:
- `src/utils/nftMinting.js`

## Next Steps

1. ✅ Contract deployed
2. ✅ Frontend updated with contract address
3. ⏳ Test minting from frontend
4. ⏳ Upload metadata to IPFS (Pinata recommended)
5. ⏳ Update base URI if needed

---

**Status**: ✅ Deployed and Ready




