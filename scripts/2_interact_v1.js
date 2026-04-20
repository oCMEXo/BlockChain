const { ethers } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;
  if (!PROXY_ADDRESS) throw new Error("Set PROXY_ADDRESS env var");

  const [owner, recipient] = await ethers.getSigners();
  const token = await ethers.getContractAt("MyTokenV1", PROXY_ADDRESS);

  const mintTx = await token.mint(owner.address, ethers.parseEther("1000"));
  await mintTx.wait();
  console.log("Minted 1000 MTK to", owner.address);
  console.log("Owner balance:", ethers.formatEther(await token.balanceOf(owner.address)));

  const recipientAddr = recipient ? recipient.address : owner.address;
  const transferTx = await token.transfer(recipientAddr, ethers.parseEther("200"));
  await transferTx.wait();
  console.log("Transferred 200 MTK to", recipientAddr);
  console.log("Owner balance:", ethers.formatEther(await token.balanceOf(owner.address)));
  console.log("Recipient balance:", ethers.formatEther(await token.balanceOf(recipientAddr)));
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
