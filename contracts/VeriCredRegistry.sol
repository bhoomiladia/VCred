// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeriCredRegistry
 * @dev Fully EIP-5192 compliant Soulbound Token (SBT) for Academic Credentials.
 * Integrates SHA-256 hashing for academic compliance and zero-transfer overrides.
 */
contract AccredRegistry is ERC721, ERC721URIStorage, Ownable {

    // EIP-5192: Minimal Soulbound NFTs Events
    event Locked(uint256 indexed tokenId);
    event Unlocked(uint256 indexed tokenId);

    event CertificateMinted(uint256 indexed tokenId, address indexed student, string issuer);
    event CertificateRevoked(uint256 indexed tokenId);
    event RootUpdated(bytes32 indexed root);

    // Mappings
    mapping(uint256 => bytes32) public certificateHashes;
    mapping(uint256 => bool) public isRevoked;
    mapping(uint256 => string) public tokenIssuer;
    mapping(bytes32 => bool) public processedBatches;

    string public baseTokenURI;
    bytes32 public merkleRoot;
    uint256 private _nextTokenId;

    constructor(address initialOwner) 
        ERC721("VeriCred Digital Certificate", "VCRD") 
        Ownable(initialOwner) 
    {}

    /**
     * @dev EIP-5192: Returns the locking status of an SBT.
     * Returning true here signals wallets like MetaMask to permanently disable "Send".
     */
    function locked(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        return true; 
    }

    /**
     * @dev Implementation of ERC-165 to signal EIP-5192 support.
     * Interface ID for EIP-5192 is 0xb45a3c0e.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721URIStorage) returns (bool) {
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }

    /**
     * @notice Issues a new Soulbound Certificate using SHA-256. (Single Issuance - strictly matching requested parameter signature)
     * @param to The student's wallet address.
     * @param certHash The SHA-256 hash of the certificate data.
     */
    function issueCertificate(address to, bytes32 certHash) external onlyOwner {
        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        certificateHashes[tokenId] = certHash;

        emit Locked(tokenId);
        emit CertificateMinted(tokenId, to, "");
    }

    /**
     * @notice Issues a new Soulbound Certificate using SHA-256, alongside URI metadata mapping.
     */
    function issueCertificate(address to, bytes32 certHash, string calldata uri, string calldata issuer) external onlyOwner {
        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        certificateHashes[tokenId] = certHash;
        tokenIssuer[tokenId] = issuer;

        // CRITICAL: Emit Locked event during minting for UI sync (EIP-5192)
        emit Locked(tokenId);
        emit CertificateMinted(tokenId, to, issuer);
    }

    /**
     * @notice Store a new Merkle root for a batch of credentials using SHA-256.
     */
    function setMerkleRoot(bytes32 root) external onlyOwner {
        require(!processedBatches[root], "VeriCred: Batch already processed");
        merkleRoot = root;
        processedBatches[root] = true;
        emit RootUpdated(root);
    }

    /**
     * @notice Mint a soulbound credential NFT via Merkle proof (SHA-256).
     */
    function mintCertificate(
        address student,
        string calldata uri,
        bytes32[] calldata proof,
        string calldata issuer
    ) external onlyOwner {
        require(merkleRoot != bytes32(0), "VeriCred: No Merkle root set");

        // Compute SHA-256 leaf
        bytes32 leaf = sha256(bytes.concat(sha256(abi.encode(student, uri))));
        require(_verifyProof(proof, merkleRoot, leaf), "VeriCred: Invalid SHA-256 Merkle proof");

        uint256 tokenId = ++_nextTokenId;
        _safeMint(student, tokenId);
        _setTokenURI(tokenId, uri);

        certificateHashes[tokenId] = leaf;
        tokenIssuer[tokenId] = issuer;

        emit Locked(tokenId);
        emit CertificateMinted(tokenId, student, issuer);
    }

    function revokeCertificate(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "VeriCred: Token does not exist");
        require(!isRevoked[tokenId], "VeriCred: Already revoked");
        isRevoked[tokenId] = true;
        emit CertificateRevoked(tokenId);
    }

    function verifyCertificate(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0) && !isRevoked[tokenId];
    }

    /**
     * @dev Internal verifier using SHA-256 (instead of keccak256).
     */
    function _verifyProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 el = proof[i];
            computed = computed <= el
                ? sha256(abi.encodePacked(computed, el))
                : sha256(abi.encodePacked(el, computed));
        }
        return computed == root;
    }

    /* ========= SOULBOUND LOGIC ========= */

    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override(ERC721)
        returns (address)
    {
        address from =
            super._update(to, tokenId, auth);

        if (from != address(0) && to != address(0)) {
            revert("Soulbound: Non-transferable");
        }

        return from;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseTokenURI = _newBaseURI;
    }

    // Required override for URI storage
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
