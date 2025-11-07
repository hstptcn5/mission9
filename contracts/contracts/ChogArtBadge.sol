// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChogArtBadge
 * @dev ERC-721 NFT contract for Chog's Art Gallery Quest
 * Mints art badges when users collect dApp portraits
 */
contract ChogArtBadge is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Mapping from dApp ID to token count
    mapping(string => uint256) public dappTokenCount;
    
    // Mapping from token ID to dApp ID
    mapping(uint256 => string) public tokenToDapp;
    
    // Events
    event ArtBadgeMinted(
        address indexed to,
        uint256 indexed tokenId,
        string indexed dappId,
        string tokenURI
    );
    
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }
    
    /**
     * @dev Mint a new Chog Art Badge for a dApp
     * @param to Address to mint the NFT to
     * @param dappId The dApp identifier (e.g., "aethonswap")
     * @param tokenURI The URI for the token metadata
     */
    function mint(
        address to,
        string memory dappId,
        string memory tokenURI
    ) public returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(dappId).length > 0, "dApp ID cannot be empty");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        tokenToDapp[newTokenId] = dappId;
        dappTokenCount[dappId]++;
        
        emit ArtBadgeMinted(to, newTokenId, dappId, tokenURI);
        
        return newTokenId;
    }
    
    /**
     * @dev Batch mint multiple badges
     */
    function batchMint(
        address[] memory recipients,
        string[] memory dappIds,
        string[] memory tokenURIs
    ) public returns (uint256[] memory) {
        require(
            recipients.length == dappIds.length && dappIds.length == tokenURIs.length,
            "Arrays length mismatch"
        );
        
        uint256[] memory tokenIds = new uint256[](recipients.length);
        
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = mint(recipients[i], dappIds[i], tokenURIs[i]);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Get total supply of minted tokens
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIds;
    }
    
    /**
     * @dev Get token count for a specific dApp
     */
    function getDappTokenCount(string memory dappId) public view returns (uint256) {
        return dappTokenCount[dappId];
    }
    
    /**
     * @dev Get dApp ID for a token
     */
    function getDappId(uint256 tokenId) public view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenToDapp[tokenId];
    }
    
    /**
     * @dev Set base URI for token metadata
     */
    function setBaseURI(string memory baseTokenURI) public onlyOwner {
        _baseTokenURI = baseTokenURI;
    }
    
    /**
     * @dev Get base URI
     */
    function baseURI() public view returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Override to include base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}

