const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoulboundVisitCardERC721", function () {
  let contract, owner, alice, bob;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("SoulboundVisitCardERC721");
    contract = await F.deploy(owner.address);
  });

  it("only owner can mint", async () => {
    await expect(
      contract.connect(alice).mintVisitCard(
        alice.address, "ipfs://x", "Alice", 1n, "Course", 2026
      )
    ).to.be.reverted;
  });

  it("owner can mint exactly one card per wallet", async () => {
    await contract.mintVisitCard(alice.address, "ipfs://x", "Alice", 1n, "Course", 2026);
    expect(await contract.ownerOf(1)).to.equal(alice.address);
    expect(await contract.tokenURI(1)).to.equal("ipfs://x");

    await expect(
      contract.mintVisitCard(alice.address, "ipfs://y", "Alice", 1n, "Course", 2026)
    ).to.be.revertedWithCustomError(contract, "AlreadyHasCard");
  });

  it("blocks transfers (soulbound)", async () => {
    await contract.mintVisitCard(alice.address, "ipfs://x", "Alice", 1n, "Course", 2026);
    await expect(
      contract.connect(alice).transferFrom(alice.address, bob.address, 1)
    ).to.be.revertedWithCustomError(contract, "SoulboundNonTransferable");
  });

  it("blocks approvals", async () => {
    await contract.mintVisitCard(alice.address, "ipfs://x", "Alice", 1n, "Course", 2026);
    await expect(
      contract.connect(alice).approve(bob.address, 1)
    ).to.be.revertedWithCustomError(contract, "SoulboundNoApprovals");
    await expect(
      contract.connect(alice).setApprovalForAll(bob.address, true)
    ).to.be.revertedWithCustomError(contract, "SoulboundNoApprovals");
  });

  it("stores on-chain attributes", async () => {
    await contract.mintVisitCard(alice.address, "ipfs://x", "Alice", 42n, "Solidity", 2026);
    const info = await contract.getStudentInfo(1);
    expect(info.studentName).to.equal("Alice");
    expect(info.studentID).to.equal(42n);
    expect(info.course).to.equal("Solidity");
    expect(info.year).to.equal(2026);
  });
});

describe("GameCharacterCollectionERC1155", function () {
  let contract, owner, alice;
  const BASE = "ipfs://CID/{id}.json";

  beforeEach(async () => {
    [owner, alice] = await ethers.getSigners();
    const F = await ethers.getContractFactory("GameCharacterCollectionERC1155");
    contract = await F.deploy(owner.address, BASE);
  });

  it("uri() resolves the {id} placeholder", async () => {
    expect(await contract.uri(7)).to.equal("ipfs://CID/7.json");
  });

  it("rejects ids outside 1..10", async () => {
    await expect(contract.uri(0)).to.be.revertedWithCustomError(contract, "InvalidCharacterId");
    await expect(contract.uri(11)).to.be.revertedWithCustomError(contract, "InvalidCharacterId");
  });

  it("only owner can define / mint", async () => {
    await expect(
      contract.connect(alice).defineCharacter(1, "X", "Red", 10, 10, 1)
    ).to.be.reverted;
    await expect(
      contract.connect(alice).mint(alice.address, 1, 1, "0x")
    ).to.be.reverted;
  });

  it("supports batch mint and batch transfer", async () => {
    const ids = [1,2,3,4,5,6,7,8,9,10];
    const ones = ids.map(() => 1);

    await contract.mintBatch(owner.address, ids, ones, "0x");
    for (const id of ids) {
      expect(await contract.balanceOf(owner.address, id)).to.equal(1n);
    }

    await contract.safeBatchTransferFrom(owner.address, alice.address, [1,2], [1,1], "0x");
    expect(await contract.balanceOf(alice.address, 1)).to.equal(1n);
    expect(await contract.balanceOf(alice.address, 2)).to.equal(1n);
    expect(await contract.balanceOf(owner.address, 1)).to.equal(0n);
  });

  it("rejects mismatched array lengths", async () => {
    await expect(
      contract.mintBatch(owner.address, [1,2], [1], "0x")
    ).to.be.revertedWithCustomError(contract, "LengthMismatch");
  });
});
