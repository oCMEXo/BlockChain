const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying SoulboundVisitCardERC721 with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("SoulboundVisitCardERC721");
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log("✅ SoulboundVisitCardERC721 deployed at:", addr);
  console.log("   Set VISIT_CARD_ADDRESS in your .env to this address.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
