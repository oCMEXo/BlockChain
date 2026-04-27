# Multi-Signature Wallet — Assignment 8

## Overview

A Solidity smart contract implementing a multi-signature (multi-sig) wallet. The wallet requires a configurable number of owner confirmations before any transaction can be executed, providing shared custody and enhanced security for on-chain assets.

## Design & Architecture

### Core Concepts

| Concept | Description |
|---|---|
| **Owners** | A set of Ethereum addresses that collectively control the wallet. |
| **Required (threshold)** | The minimum number of owner confirmations needed to execute a transaction. For example, a *2-of-3* wallet has 3 owners and requires 2 confirmations. |
| **Transaction lifecycle** | `submit → confirm → execute`. Any owner may also `revoke` their confirmation before execution. |

### Data Structures

- `Transaction` struct — stores `to`, `value`, `data`, `executed` flag, and `confirmationCount`.
- `owners[]` array + `isOwner` mapping — O(1) membership checks, iterable list.
- `isConfirmed[txId][owner]` — tracks which owner confirmed which transaction.

### Access Control

| Function | Who can call |
|---|---|
| `submitTransaction`, `confirmTransaction`, `revokeConfirmation`, `executeTransaction` | Any owner (`onlyOwner`) |
| `addOwner`, `removeOwner`, `changeRequirement` | The wallet itself (`onlyWallet`), meaning these must be proposed and confirmed as multi-sig transactions |

### Security Considerations

1. **Checks-Effects-Interactions** — `executeTransaction` marks the tx as executed *before* making the external call, preventing reentrancy.
2. **No duplicate confirmations** — the `notConfirmed` modifier prevents an owner from confirming the same tx twice.
3. **Dynamic owner management is self-governed** — adding/removing owners requires a multi-sig tx, so no single owner can unilaterally change governance.
4. **Threshold auto-adjustment** — removing an owner automatically lowers `required` if it would exceed the new owner count.

### Potential Vulnerabilities & Mitigations

- **Key compromise**: If enough owner keys are compromised to meet the threshold, the wallet is at risk. Mitigation: use hardware wallets, distribute keys geographically, consider higher thresholds.
- **Stuck transactions**: If owners lose keys and the remaining owners can't meet the threshold, funds are locked forever. Mitigation: carefully choose the threshold and maintain key backups.
- **Malicious calldata**: Since `submitTransaction` accepts arbitrary `data`, an owner could propose a call that looks harmless but interacts with a malicious contract. Mitigation: owners should verify calldata off-chain before confirming.

## Project Structure

```
multisig-wallet/
├── contracts/
│   └── MultiSigWallet.sol    # Main contract
├── test/
│   └── MultiSigWallet.test.js # Unit tests (30+ cases)
├── scripts/
│   └── deploy.js              # Deployment script
├── hardhat.config.js
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install & Compile

```bash
npm install
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Deploy (local Hardhat network)

```bash
npx hardhat run scripts/deploy.js
```

## Interacting with the Contract

### 1. Deploy

Pass an array of owner addresses and the confirmation threshold to the constructor:

```solidity
new MultiSigWallet([addr1, addr2, addr3], 2)
```

### 2. Fund the wallet

Send Ether directly to the contract address. The `receive()` function accepts it and emits a `Deposit` event.

### 3. Propose a transaction

Any owner calls:

```solidity
wallet.submitTransaction(to, value, data);
```

- `to` — recipient address
- `value` — amount of wei
- `data` — calldata (use `"0x"` for plain Ether transfers)

### 4. Confirm

Other owners call:

```solidity
wallet.confirmTransaction(txId);
```

### 5. Execute

Once the confirmation count reaches `required`, any owner calls:

```solidity
wallet.executeTransaction(txId);
```

### 6. Revoke (optional)

Before execution, an owner can withdraw their confirmation:

```solidity
wallet.revokeConfirmation(txId);
```

## Role of Multi-Sig Wallets in DeFi

Multi-signature wallets are a cornerstone of decentralized governance and treasury management. They eliminate single points of failure by requiring consensus among multiple key-holders. Common use-cases include:

- **DAO treasuries** — community funds managed by elected signers.
- **Team vesting** — startup tokens held in multi-sig until vesting milestones.
- **Protocol admin keys** — contract upgrades gated behind a multi-sig to prevent unilateral changes.
- **Escrow** — funds released only when both buyer and seller (plus an optional arbiter) agree.

By distributing trust across multiple parties, multi-sig wallets significantly reduce the risk of theft, insider fraud, and accidental loss compared to single-key wallets.
