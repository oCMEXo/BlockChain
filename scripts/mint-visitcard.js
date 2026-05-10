// scripts/mint-visitcard.js
//
// Mints exactly ONE soulbound visit card to STUDENT_WALLET.
// Run AFTER deploying and setting VISIT_CARD_ADDRESS in .env.

const hre = require("hardhat");
require("dotenv").config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const addr     = required("VISIT_CARD_ADDRESS");
  const student  = required("STUDENT_WALLET");
  const tokenURI = process.env.VISIT_CARD_TOKEN_URI || "ipfs://REPLACE_CID/visit-card.json";

  const contract = await hre.ethers.getContractAt("SoulboundVisitCardERC721", addr);

  console.log(`Minting visit card to ${student} ...`);
  const tx = await contract.mintVisitCard(
    student,
    tokenURI,
    "<YOUR_NAME>",
    20240001n,
    "Blockchain & Smart Contracts",
    2026
  );
  const receipt = await tx.wait();
  console.log("✅ Minted. Tx hash:", receipt.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
