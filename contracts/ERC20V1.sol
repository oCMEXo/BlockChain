// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title ERC20 V1 — Initial upgradeable token implementation
/// @notice UUPS-upgradeable ERC20 with mint capability
contract MyTokenV1 is ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializer replaces the constructor for proxied contracts
    function initialize(
        string memory name_,
        string memory symbol_,
        address initialOwner
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __Ownable_init(initialOwner);

    }

    /// @notice Mint new tokens — only owner
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @dev Required override — only owner may upgrade
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
