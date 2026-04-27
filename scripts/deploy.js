import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const signers = await ethers.getSigners();
  const owners = signers.slice(0, 3).map((s) => s.address);
  const required = 2;

  console.log("Deploying MultiSigWallet...");
  console.log("  Owners:", owners);
  console.log("  Required confirmations:", required);

  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const wallet = await MultiSigWallet.deploy(owners, required);
  await wallet.waitForDeployment();

  const address = await wallet.getAddress();
  console.log(`\n  MultiSigWallet deployed to: ${address}`);
  console.log("\nDone!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
