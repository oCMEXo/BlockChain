async function main() {
  const unlockTime = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const Lock = await ethers.getContractFactory("Lock");
  const lock = await Lock.deploy(unlockTime);
  await lock.waitForDeployment();
  const address = await lock.getAddress();
  console.log("Lock deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
