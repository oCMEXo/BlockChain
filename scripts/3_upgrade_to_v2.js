const { ethers, upgrades } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;
  if (!PROXY_ADDRESS) throw new Error("Set PROXY_ADDRESS env var");

  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);

  const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
  const upgraded  = await upgrades.upgradeProxy(PROXY_ADDRESS, MyTokenV2, { kind: "uups" });
  await upgraded.waitForDeployment();

  const newImpl = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("Proxy still at:", PROXY_ADDRESS);
  console.log("New V2 impl at:", newImpl);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
