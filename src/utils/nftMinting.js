import { ethers } from 'ethers'
import { getProvider } from './monadRPC'

// Simple ERC-721 NFT contract for minting Chog Art Badges
// Deployed on Monad testnet
const NFT_CONTRACT_ADDRESS = '0x2B79C2676E631C40519503F75D116249cb08b02B'
const NFT_ABI = [
  'function mint(address to, string memory dappId, string memory tokenURI) public returns (uint256)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function totalSupply() public view returns (uint256)',
  'function getDappId(uint256 tokenId) public view returns (string memory)',
  'function getDappTokenCount(string memory dappId) public view returns (uint256)',
]

export async function mintChogArtBadge(walletAddress, dappId, artData) {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Wallet not connected')
    }

    const provider = getProvider()
    const signer = await provider.getSigner()
    const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer)

    // Create metadata (in production, upload to IPFS)
    const metadata = {
      name: `Chog Art Badge: ${dappId}`,
      description: `Art portrait of ${dappId} painted by Chog`,
      image: artData, // Base64 or IPFS hash
      attributes: [
        { trait_type: 'dApp', value: dappId },
        { trait_type: 'Artist', value: 'Chog' },
        { trait_type: 'Chain', value: 'Monad' },
      ],
    }

    // In production, upload metadata to IPFS (Pinata)
    // const ipfsHash = await uploadToIPFS(metadata)
    const tokenURI = `ipfs://placeholder/${dappId}` // Would be actual IPFS hash

    // Mint NFT - contract auto-generates tokenId
    const tx = await contract.mint(walletAddress, dappId, tokenURI)
    const receipt = await tx.wait()
    
    // Get tokenId from event or transaction
    // Contract emits ArtBadgeMinted event with tokenId
    const tokenId = receipt.logs?.[0]?.topics?.[2] 
      ? BigInt(receipt.logs[0].topics[2]).toString() 
      : 'pending'

    return {
      success: true,
      tokenId,
      txHash: tx.hash,
      dappId,
    }
  } catch (error) {
    console.error('Error minting NFT:', error)
    throw error
  }
}

export async function checkBadgeBalance(walletAddress) {
  try {
    const provider = getProvider()
    const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, provider)
    const balance = await contract.balanceOf(walletAddress)
    return Number(balance)
  } catch (error) {
    console.error('Error checking badge balance:', error)
    return 0
  }
}

