# NFT Assignment 9 — Soulbound Visit Card + Game Character Collection

This repo contains two Solidity contracts that satisfy Assignment 9:

| # | Standard | Contract | Purpose |
|---|----------|----------|---------|
| 1 | **ERC-721** (soulbound) | `SoulboundVisitCardERC721.sol` | One non-transferable "student visit card" per wallet |
| 2 | **ERC-1155** | `GameCharacterCollectionERC1155.sol` | Collection of 10 distinct game characters with batch mint/transfer |

Built with **Solidity 0.8.24**, **Hardhat**, and **OpenZeppelin Contracts v5**.

---

## Project layout

```
nft-assignment/
├── contracts/
│   ├── SoulboundVisitCardERC721.sol
│   └── GameCharacterCollectionERC1155.sol
├── scripts/
│   ├── deploy-visitcard.js
│   ├── deploy-characters.js
│   ├── mint-visitcard.js
│   ├── mint-characters.js
│   └── generate-metadata.js
├── test/
│   └── contracts.test.js
├── metadata/
│   ├── visit-card/visit-card.json
│   └── game-characters/1.json … 10.json
├── hardhat.config.js
├── package.json
└── .env.example
```

---

## 1. Quick setup

```bash
# 1. Install dependencies (npm or yarn)
npm install

# 2. Copy env template and fill in values
cp .env.example .env
# edit .env — at minimum set PRIVATE_KEY, SEPOLIA_RPC_URL, STUDENT_WALLET

# 3. Compile
npx hardhat compile

# 4. Run the test suite
npx hardhat test
```

---

## 2. Local end-to-end run

In one terminal:

```bash
npx hardhat node
```

In another:

```bash
# Deploy both contracts
npx hardhat run scripts/deploy-visitcard.js --network localhost
npx hardhat run scripts/deploy-characters.js --network localhost

# Copy the printed addresses into .env as VISIT_CARD_ADDRESS and CHARACTERS_ADDRESS,
# then mint:
npx hardhat run scripts/mint-visitcard.js  --network localhost
npx hardhat run scripts/mint-characters.js --network localhost
```

The `mint-characters.js` script will:
1. Define on-chain attributes for all 10 characters.
2. Batch-mint **10 NFTs** (1 per id) to the deployer.
3. Batch-transfer **2 NFTs** (ids #1 and #2) to `STUDENT_WALLET`.

---

## 3. Sepolia (or any public testnet)

```bash
npx hardhat run scripts/deploy-visitcard.js  --network sepolia
npx hardhat run scripts/deploy-characters.js --network sepolia
# update .env with the deployed addresses, then:
npx hardhat run scripts/mint-visitcard.js    --network sepolia
npx hardhat run scripts/mint-characters.js   --network sepolia
```

Get test ETH from any Sepolia faucet (e.g. Alchemy or Infura faucets).

---

## 4. Metadata: structure and storage

Metadata is stored **off-chain on IPFS** and referenced by URI from each contract.

### Visit card (ERC-721)

`metadata/visit-card/visit-card.json`:

```json
{
  "name": "Student Visit Card — <YOUR_NAME>",
  "description": "Soulbound digital visit card …",
  "image": "ipfs://REPLACE_CID/visit-card.png",
  "attributes": [
    { "trait_type": "Student Name", "value": "<YOUR_NAME>" },
    { "trait_type": "Student ID",   "value": 20240001 },
    { "trait_type": "Course",       "value": "Blockchain & Smart Contracts" },
    { "trait_type": "Year",         "value": 2026 },
    { "trait_type": "Soulbound",    "value": "true" }
  ]
}
```

The contract also stores `studentName`, `studentID`, `course`, and `year` **on-chain** (read via `getStudentInfo(tokenId)`) — this guarantees the attributes survive even if IPFS pinning lapses.

### Game characters (ERC-1155)

The contract is initialised with a **base URI** containing the `{id}` placeholder, e.g.:

```
ipfs://<CID>/{id}.json
```

`uri(7)` then resolves to `ipfs://<CID>/7.json`. Each of the 10 JSON files
(`metadata/game-characters/1.json` … `10.json`) has the form:

```json
{
  "name": "Pyro Knight",
  "description": "A legendary game character …",
  "image": "ipfs://REPLACE_CID/1.png",
  "attributes": [
    { "trait_type": "Color",    "value": "Crimson" },
    { "trait_type": "Speed",    "value": 55 },
    { "trait_type": "Strength", "value": 90 },
    { "trait_type": "Rarity",   "value": "Legendary" }
  ]
}
```

This shape is the standard accepted by OpenSea, Rarible, Magic Eden, etc.

### Pinning to IPFS

```bash
# Example with the Pinata or web3.storage CLI:
ipfs add -r metadata/game-characters/   # → returns a folder CID
# Use that CID as CHARACTERS_BASE_URI = "ipfs://<CID>/{id}.json"
```

After pinning, update `.env`:

```
VISIT_CARD_TOKEN_URI=ipfs://<CARD_CID>/visit-card.json
CHARACTERS_BASE_URI=ipfs://<CHARS_CID>/{id}.json
```

You can also call `setURI(newURI)` on the deployed ERC-1155 if you re-pin later.

---

## 5. Soulbound design (ERC-721)

The soulbound behaviour is enforced by **two independent layers**:

1. **`_update(...)` override** — In OpenZeppelin v5, every state change
   (mint / transfer / burn) goes through `_update`. The override allows
   mints (`from == address(0)`) and reverts everything else with
   `SoulboundNonTransferable`.
2. **`approve` / `setApprovalForAll` overrides** — Both revert with
   `SoulboundNoApprovals`, so wallets and marketplaces cannot create
   misleading approval state.

A `hasCard[address]` mapping additionally guarantees that each wallet can
hold at most one card (`AlreadyHasCard` is reverted otherwise). Only the
contract owner (`Ownable`) can call `mintVisitCard`.

---

## 6. ERC-1155 design highlights

- `MAX_CHARACTER_ID = 10` — ids must be in `1..10`; out-of-range mints/uri
  calls revert with `InvalidCharacterId`.
- `defineCharacter(...)` stores on-chain attributes (name, color, speed,
  strength, rarity). Useful for any on-chain game logic.
- `mint(...)` — single id, owner-only.
- `mintBatch(...)` — multiple ids in one tx. Demonstrates ERC-1155's
  signature efficiency: 10 mints in one transaction instead of 10.
- `safeBatchTransferFrom(...)` (inherited) — used in `mint-characters.js`
  to send 2 NFTs to the student in one tx.
- `setURI(...)` — owner-only, allows updating the base URI if the IPFS
  pin changes.
- Inherits `ERC1155Supply` so `totalSupply(id)` and `exists(id)` are
  available — handy for analytics and marketplaces.

---

## 7. Deliverables checklist

| Requirement | Where |
|-------------|-------|
| ERC-721 soulbound visit card | `contracts/SoulboundVisitCardERC721.sol` |
| ERC-1155 collection of 10 distinct ids | `contracts/GameCharacterCollectionERC1155.sol` |
| OpenZeppelin imports | top of each contract |
| At least 2 metadata params per token | visit card: 4 (name, ID, course, year); characters: 4 (color, speed, strength, rarity) |
| Soulbound enforcement (block transfers + approvals) | `_update`, `approve`, `setApprovalForAll` overrides |
| Owner-only minting | `Ownable` + `onlyOwner` on mint functions |
| Batch mint + batch transfer demo | `mintBatch`, `safeBatchTransferFrom` (used in `scripts/mint-characters.js`) |
| Off-chain metadata via IPFS | `metadata/` + `tokenURI` / `uri` |
| Deployment scripts | `scripts/deploy-*.js` |
| README explaining everything | this file |
| Deployment proof | record tx hashes printed by the mint scripts (see §8) |

---

## 8. Capturing proof of functionality

After running the mint scripts, you'll see output like:

```
✅ Minted. Tx hash: 0xabc123…
✅ Batch mint tx: 0xdef456…
✅ Batch transfer tx: 0x789aaa…
```

Save those hashes. On Sepolia, paste each into
`https://sepolia.etherscan.io/tx/<hash>` and screenshot:

1. The visit-card mint tx (one NFT to student).
2. The ERC-1155 batch mint tx (10 NFTs created).
3. The ERC-1155 batch transfer tx (2 NFTs to student).

Also screenshot the wallet (e.g. on `testnets.opensea.io` or in MetaMask)
showing the student wallet now holds 1 SVC + 2 character NFTs.

---

## 9. Security notes

- All external state-changing functions are `onlyOwner`.
- Custom errors (`SoulboundNonTransferable`, `InvalidCharacterId`, etc.)
  are cheaper than `require` strings and clearer to debug.
- Solidity `^0.8.20` provides built-in overflow checks; we set the pragma
  to `^0.8.20` for OZ v5 compatibility and pin the compiler to `0.8.24`.
- Optimizer runs = 200, the standard balance for deploy + runtime cost.
- No `selfdestruct`, no delegatecall, no upgradeability hooks — small
  surface area by design.
