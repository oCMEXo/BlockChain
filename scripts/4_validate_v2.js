const { ethers } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;
  if (!PROXY_ADDRESS) throw new Error("Set PROXY_ADDRESS env var");

  const token = await ethers.getContractAt("MyTokenV2", PROXY_ADDRESS);

  const ver = await token.version();
  console.log("version():", ver);

  const [owner, recipient] = await ethers.getSigners();
  console.log("Owner balance:", ethers.formatEther(await token.balanceOf(owner.address)));
  if (recipient) {
    console.log("Recipient balance:", ethers.formatEther(await token.balanceOf(recipient.address)));
  }
  console.log("Total supply:", ethers.formatEther(await token.totalSupply()));
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
