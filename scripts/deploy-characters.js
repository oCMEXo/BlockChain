const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const baseURI = process.env.CHARACTERS_BASE_URI || "ipfs://REPLACE_CID/{id}.json";

  console.log("Deploying GameCharacterCollectionERC1155 with:", deployer.address);
  console.log("Base URI:", baseURI);

  const Factory = await hre.ethers.getContractFactory("GameCharacterCollectionERC1155");
  const contract = await Factory.deploy(deployer.address, baseURI);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log("✅ GameCharacterCollectionERC1155 deployed at:", addr);
  console.log("   Set CHARACTERS_ADDRESS in your .env to this address.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
