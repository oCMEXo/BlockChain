const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const MyTokenV1 = await ethers.getContractFactory("MyTokenV1");
  const proxy = await upgrades.deployProxy(
    MyTokenV1,
    ["MyToken", "MTK", deployer.address],
    { kind: "uups" }
  );
  await proxy.waitForDeployment();

  const proxyAddr = await proxy.getAddress();
  const implAddr  = await upgrades.erc1967.getImplementationAddress(proxyAddr);

  console.log("Proxy  deployed to:", proxyAddr);
  console.log("V1 impl deployed to:", implAddr);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
