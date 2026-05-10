// scripts/mint-characters.js
//
// 1) Defines on-chain attributes for all 10 characters.
// 2) Batch-mints a total of 10 NFTs (one per id) to the contract owner.
// 3) Transfers 2 of them (ids #1 and #2) to STUDENT_WALLET via safeBatchTransferFrom.

const hre = require("hardhat");
require("dotenv").config();

const CHARACTERS = [
  { id: 1,  name: "Pyro Knight",      color: "Crimson",    speed: 55, strength: 90, rarity: 4 },
  { id: 2,  name: "Frost Mage",       color: "Cyan",       speed: 70, strength: 60, rarity: 3 },
  { id: 3,  name: "Shadow Rogue",     color: "Black",      speed: 95, strength: 50, rarity: 3 },
  { id: 4,  name: "Storm Archer",     color: "Indigo",     speed: 80, strength: 65, rarity: 2 },
  { id: 5,  name: "Earth Guardian",   color: "Forest",     speed: 40, strength: 95, rarity: 4 },
  { id: 6,  name: "Solar Priestess",  color: "Gold",       speed: 60, strength: 55, rarity: 3 },
  { id: 7,  name: "Void Reaper",      color: "Violet",     speed: 75, strength: 85, rarity: 4 },
  { id: 8,  name: "Iron Berserker",   color: "Steel",      speed: 50, strength: 88, rarity: 2 },
  { id: 9,  name: "Wind Dancer",      color: "Sky",        speed: 99, strength: 45, rarity: 2 },
  { id: 10, name: "Crystal Sage",     color: "Aquamarine", speed: 65, strength: 70, rarity: 1 },
];

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const addr    = required("CHARACTERS_ADDRESS");
  const student = required("STUDENT_WALLET");
  const [owner] = await hre.ethers.getSigners();

  const contract = await hre.ethers.getContractAt(
    "GameCharacterCollectionERC1155",
    addr,
    owner
  );

  // 1. Define every character on-chain
  console.log("Defining 10 characters ...");
  for (const c of CHARACTERS) {
    const tx = await contract.defineCharacter(
      c.id, c.name, c.color, c.speed, c.strength, c.rarity
    );
    await tx.wait();
    console.log(`   #${c.id}  ${c.name}`);
  }

  // 2. Batch-mint all 10 (1 each) to owner
  const ids     = CHARACTERS.map(c => c.id);
  const amounts = CHARACTERS.map(() => 1);
  console.log("Batch-minting 10 NFTs (1 per id) to owner ...");
  const mintTx = await contract.mintBatch(owner.address, ids, amounts, "0x");
  const mintReceipt = await mintTx.wait();
  console.log("✅ Batch mint tx:", mintReceipt.hash);

  // 3. Batch-transfer 2 NFTs (ids 1 and 2) to the student
  console.log(`Batch-transferring ids [1,2] to student ${student} ...`);
  const xferTx = await contract.safeBatchTransferFrom(
    owner.address,
    student,
    [1, 2],
    [1, 1],
    "0x"
  );
  const xferReceipt = await xferTx.wait();
  console.log("✅ Batch transfer tx:", xferReceipt.hash);

  // 4. Sanity check balances
  const balStudent = await contract.balanceOfBatch(
    [student, student],
    [1, 2]
  );
  console.log("Student balances of #1, #2:", balStudent.map(b => b.toString()));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
