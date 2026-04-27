// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MultiSigWallet
 * @notice A multi-signature wallet requiring multiple owner confirmations
 *         before executing transactions. Supports Ether transfers, arbitrary
 *         contract calls, dynamic owner management, and confirmation revocation.
 * @dev    Follows checks-effects-interactions pattern throughout.
 */
contract MultiSigWallet {
    // ──────────────────────────── Events ────────────────────────────

    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event TransactionSubmitted(
        uint256 indexed txId,
        address indexed proposer,
        address indexed to,
        uint256 value,
        bytes data
    );
    event TransactionConfirmed(uint256 indexed txId, address indexed owner);
    event ConfirmationRevoked(uint256 indexed txId, address indexed owner);
    event TransactionExecuted(uint256 indexed txId, address indexed executor);
    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed removedOwner);
    event RequirementChanged(uint256 newRequired);

    // ──────────────────────── Data Structures ──────────────────────

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmationCount;
    }

    // ──────────────────────── State Variables ─────────────────────

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required; // min confirmations to execute

    Transaction[] public transactions;
    // txId => owner => confirmed?
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    // ──────────────────────────── Modifiers ───────────────────────

    modifier onlyOwner() {
        require(isOwner[msg.sender], "MultiSig: caller is not owner");
        _;
    }

    modifier onlyWallet() {
        require(msg.sender == address(this), "MultiSig: caller is not wallet");
        _;
    }

    modifier txExists(uint256 _txId) {
        require(_txId < transactions.length, "MultiSig: tx does not exist");
        _;
    }

    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "MultiSig: tx already executed");
        _;
    }

    modifier notConfirmed(uint256 _txId) {
        require(
            !isConfirmed[_txId][msg.sender],
            "MultiSig: tx already confirmed by caller"
        );
        _;
    }

    // ──────────────────────── Constructor ─────────────────────────

    /**
     * @param _owners   Array of initial owner addresses.
     * @param _required Number of confirmations needed to execute a tx.
     */
    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "MultiSig: owners required");
        require(
            _required > 0 && _required <= _owners.length,
            "MultiSig: invalid required count"
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "MultiSig: zero address owner");
            require(!isOwner[owner], "MultiSig: duplicate owner");

            isOwner[owner] = true;
            owners.push(owner);
        }

        required = _required;
    }

    // ──────────────────────── Receive Ether ──────────────────────

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // ──────────── Transaction Lifecycle Functions ─────────────────

    /**
     * @notice Submit a new transaction for owner approval.
     * @param _to    Destination address.
     * @param _value Amount of Ether (in wei) to send.
     * @param _data  Calldata for contract interaction (empty for plain transfer).
     * @return txId  The index of the newly created transaction.
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyOwner returns (uint256 txId) {
        txId = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                confirmationCount: 0
            })
        );

        emit TransactionSubmitted(txId, msg.sender, _to, _value, _data);
    }

    /**
     * @notice Confirm an existing, unexecuted transaction.
     */
    function confirmTransaction(
        uint256 _txId
    )
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        notConfirmed(_txId)
    {
        Transaction storage txn = transactions[_txId];
        isConfirmed[_txId][msg.sender] = true;
        txn.confirmationCount += 1;

        emit TransactionConfirmed(_txId, msg.sender);
    }

    /**
     * @notice Execute a transaction once it has enough confirmations.
     * @dev    Uses checks-effects-interactions: state is updated before
     *         the external call to prevent reentrancy.
     */
    function executeTransaction(
        uint256 _txId
    ) external onlyOwner txExists(_txId) notExecuted(_txId) {
        Transaction storage txn = transactions[_txId];

        require(
            txn.confirmationCount >= required,
            "MultiSig: not enough confirmations"
        );

        // Effects before interactions
        txn.executed = true;

        // Interaction
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "MultiSig: tx execution failed");

        emit TransactionExecuted(_txId, msg.sender);
    }

    /**
     * @notice Revoke a previously given confirmation (before execution).
     */
    function revokeConfirmation(
        uint256 _txId
    ) external onlyOwner txExists(_txId) notExecuted(_txId) {
        require(
            isConfirmed[_txId][msg.sender],
            "MultiSig: tx not confirmed by caller"
        );

        Transaction storage txn = transactions[_txId];
        isConfirmed[_txId][msg.sender] = false;
        txn.confirmationCount -= 1;

        emit ConfirmationRevoked(_txId, msg.sender);
    }

    // ──────────── Dynamic Owner Management (via wallet) ──────────

    /**
     * @notice Add a new owner. Must be called via an approved multi-sig tx.
     */
    function addOwner(address _owner) external onlyWallet {
        require(_owner != address(0), "MultiSig: zero address");
        require(!isOwner[_owner], "MultiSig: already owner");

        isOwner[_owner] = true;
        owners.push(_owner);

        emit OwnerAdded(_owner);
    }

    /**
     * @notice Remove an existing owner. Must be called via an approved
     *         multi-sig tx. Adjusts `required` downward if necessary.
     */
    function removeOwner(address _owner) external onlyWallet {
        require(isOwner[_owner], "MultiSig: not an owner");
        require(owners.length - 1 > 0, "MultiSig: cannot remove last owner");

        isOwner[_owner] = false;

        // Remove from array (swap-and-pop)
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        // Lower required if it now exceeds owner count
        if (required > owners.length) {
            required = owners.length;
            emit RequirementChanged(required);
        }

        emit OwnerRemoved(_owner);
    }

    /**
     * @notice Change the confirmation threshold. Must be called via an
     *         approved multi-sig tx.
     */
    function changeRequirement(uint256 _required) external onlyWallet {
        require(
            _required > 0 && _required <= owners.length,
            "MultiSig: invalid requirement"
        );
        required = _required;
        emit RequirementChanged(_required);
    }

    // ──────────────────────── View Helpers ────────────────────────

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(
        uint256 _txId
    )
        external
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 confirmationCount
        )
    {
        Transaction storage txn = transactions[_txId];
        return (txn.to, txn.value, txn.data, txn.executed, txn.confirmationCount);
    }
}
