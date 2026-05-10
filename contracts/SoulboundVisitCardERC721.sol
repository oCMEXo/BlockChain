// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoulboundVisitCardERC721
 * @notice Non-transferable (soulbound) ERC-721 used as a digital "Student Visit Card".
 *         Exactly one token can be minted per student wallet. Once minted, the token
 *         can never be transferred or approved — it is permanently bound to the wallet.
 *
 * Design notes:
 *  - Uses OpenZeppelin v5.x. In v5 the single hook for transfer logic is `_update`.
 *  - We block ALL transfers except the mint (when `from == address(0)`).
 *  - We additionally revert in approve / setApprovalForAll so wallets / marketplaces
 *    cannot create misleading approval state.
 *  - On-chain student attributes are stored alongside the off-chain image/metadata URI.
 */
contract SoulboundVisitCardERC721 is ERC721URIStorage, Ownable {
    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @dev Auto-incrementing token id counter (starts at 1).
    uint256 private _nextTokenId = 1;

    /// @dev On-chain attributes for each visit card.
    struct StudentInfo {
        string  studentName;   // e.g. "<YOUR_NAME>"
        uint256 studentID;     // e.g. 20240001
        string  course;        // e.g. "Blockchain & Smart Contracts"
        uint16  year;          // e.g. 2026
    }

    /// @dev tokenId => student attributes
    mapping(uint256 => StudentInfo) private _studentInfo;

    /// @dev Ensures one card per wallet.
    mapping(address => bool) public hasCard;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event VisitCardMinted(
        address indexed student,
        uint256 indexed tokenId,
        string studentName,
        uint256 studentID
    );

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error SoulboundNonTransferable();
    error SoulboundNoApprovals();
    error AlreadyHasCard(address student);

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(address initialOwner)
        ERC721("Student Visit Card", "SVC")
        Ownable(initialOwner)
    {}

    // ---------------------------------------------------------------------
    // Minting (admin only)
    // ---------------------------------------------------------------------

    /**
     * @notice Mint a soulbound visit card to `student`.
     * @param  student      Recipient wallet (must not already own a card).
     * @param  uri          Token metadata URI (ipfs://... recommended).
     * @param  studentName  Name to record on-chain.
     * @param  studentID    Numeric student ID.
     * @param  course       Course / programme name.
     * @param  year         Academic year.
     */
    function mintVisitCard(
        address student,
        string calldata uri,
        string calldata studentName,
        uint256 studentID,
        string calldata course,
        uint16 year
    ) external onlyOwner returns (uint256 tokenId) {
        if (hasCard[student]) revert AlreadyHasCard(student);

        tokenId = _nextTokenId++;
        hasCard[student] = true;

        _safeMint(student, tokenId);
        _setTokenURI(tokenId, uri);

        _studentInfo[tokenId] = StudentInfo({
            studentName: studentName,
            studentID:   studentID,
            course:      course,
            year:        year
        });

        emit VisitCardMinted(student, tokenId, studentName, studentID);
    }

    // ---------------------------------------------------------------------
    // Read helpers
    // ---------------------------------------------------------------------

    function getStudentInfo(uint256 tokenId)
        external
        view
        returns (StudentInfo memory)
    {
        _requireOwned(tokenId);
        return _studentInfo[tokenId];
    }

    // ---------------------------------------------------------------------
    // Soulbound enforcement
    // ---------------------------------------------------------------------

    /**
     * @dev OpenZeppelin v5 routes every mint / transfer / burn through `_update`.
     *      We allow only mints (auth from address(0)). Any other movement reverts.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Allow mint (from == 0). Block transfers and burns.
        if (from != address(0)) {
            revert SoulboundNonTransferable();
        }

        return super._update(to, tokenId, auth);
    }

    /// @dev Block single-token approvals.
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert SoulboundNoApprovals();
    }

    /// @dev Block operator approvals.
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert SoulboundNoApprovals();
    }
}
