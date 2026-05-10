// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title GameCharacterCollectionERC1155
 * @notice ERC-1155 multi-token collection of 10 distinct game characters.
 *         - Each token id (1..10) represents a unique character with on-chain attributes.
 *         - Metadata follows the ERC-1155 metadata standard: a base URI containing
 *           the substitution string `{id}` resolves to a JSON file per token.
 *         - Supports normal transfers, batch minting, and batch transfers.
 *         - Minting is restricted to the contract owner (Ownable).
 */
contract GameCharacterCollectionERC1155 is ERC1155Supply, Ownable {
    using Strings for uint256;

    // ---------------------------------------------------------------------
    // Constants & storage
    // ---------------------------------------------------------------------

    uint256 public constant MAX_CHARACTER_ID = 10;

    /// @dev On-chain attributes for each character.
    struct Character {
        string  name;       // e.g. "Pyro Knight"
        string  color;      // e.g. "Crimson"
        uint16  speed;      // 1..100
        uint16  strength;   // 1..100
        uint8   rarity;     // 1=Common, 2=Rare, 3=Epic, 4=Legendary
    }

    /// @dev id => attributes
    mapping(uint256 => Character) public characters;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event CharacterDefined(
        uint256 indexed id,
        string name,
        string color,
        uint16 speed,
        uint16 strength,
        uint8 rarity
    );

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error InvalidCharacterId(uint256 id);
    error LengthMismatch();

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /**
     * @param initialOwner  Owner / admin address.
     * @param baseURI       Metadata base URI containing `{id}`,
     *                      e.g. "ipfs://<CID>/{id}.json".
     */
    constructor(address initialOwner, string memory baseURI)
        ERC1155(baseURI)
        Ownable(initialOwner)
    {}

    // ---------------------------------------------------------------------
    // Admin: define / update character attributes
    // ---------------------------------------------------------------------

    function defineCharacter(
        uint256 id,
        string calldata name,
        string calldata color,
        uint16 speed,
        uint16 strength,
        uint8 rarity
    ) external onlyOwner {
        if (id == 0 || id > MAX_CHARACTER_ID) revert InvalidCharacterId(id);
        characters[id] = Character(name, color, speed, strength, rarity);
        emit CharacterDefined(id, name, color, speed, strength, rarity);
    }

    /// @notice Update the metadata base URI (e.g. after re-pinning to IPFS).
    function setURI(string calldata newURI) external onlyOwner {
        _setURI(newURI);
    }

    // ---------------------------------------------------------------------
    // Minting
    // ---------------------------------------------------------------------

    /// @notice Mint a single character to `to`.
    function mint(address to, uint256 id, uint256 amount, bytes calldata data)
        external
        onlyOwner
    {
        if (id == 0 || id > MAX_CHARACTER_ID) revert InvalidCharacterId(id);
        _mint(to, id, amount, data);
    }

    /**
     * @notice Mint several character ids in one tx (demonstrates batch efficiency).
     * @param  to       Recipient.
     * @param  ids      Character ids.
     * @param  amounts  Quantities (parallel to `ids`).
     * @param  data     Forwarded to ERC-1155 receiver hook.
     */
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes   calldata data
    ) external onlyOwner {
        if (ids.length != amounts.length) revert LengthMismatch();
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            if (id == 0 || id > MAX_CHARACTER_ID) revert InvalidCharacterId(id);
        }
        _mintBatch(to, ids, amounts, data);
    }

    // ---------------------------------------------------------------------
    // Metadata
    // ---------------------------------------------------------------------

    /**
     * @notice Returns the metadata URI for `id`.
     *         OpenSea / most marketplaces also accept the literal `{id}` template
     *         from the base ERC-1155 standard, but returning a fully-resolved URL
     *         here is friendlier to wallets and indexers.
     */
    function uri(uint256 id) public view override returns (string memory) {
        if (id == 0 || id > MAX_CHARACTER_ID) revert InvalidCharacterId(id);
        string memory base = super.uri(id); // contains "{id}"
        return string(abi.encodePacked(_replaceId(base, id.toString())));
    }

    // ---------------------------------------------------------------------
    // Internal: replace the {id} placeholder
    // ---------------------------------------------------------------------

    function _replaceId(string memory template, string memory idStr)
        private
        pure
        returns (string memory)
    {
        bytes memory t = bytes(template);
        bytes memory placeholder = bytes("{id}");

        // Search for "{id}" in the template.
        if (t.length < placeholder.length) return template;

        for (uint256 i = 0; i <= t.length - placeholder.length; i++) {
            bool match_ = true;
            for (uint256 j = 0; j < placeholder.length; j++) {
                if (t[i + j] != placeholder[j]) { match_ = false; break; }
            }
            if (match_) {
                bytes memory before_ = new bytes(i);
                for (uint256 k = 0; k < i; k++) before_[k] = t[k];

                uint256 tailLen = t.length - i - placeholder.length;
                bytes memory after_ = new bytes(tailLen);
                for (uint256 k = 0; k < tailLen; k++) {
                    after_[k] = t[i + placeholder.length + k];
                }
                return string(abi.encodePacked(before_, idStr, after_));
            }
        }
        return template;
    }
}
