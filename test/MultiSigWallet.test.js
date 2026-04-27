import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("MultiSigWallet", function () {
  let wallet;
  let owner1, owner2, owner3, nonOwner, recipient;
  const REQUIRED = 2; // 2-of-3

  beforeEach(async function () {
    [owner1, owner2, owner3, nonOwner, recipient] = await ethers.getSigners();

    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    wallet = await MultiSigWallet.deploy(
      [owner1.address, owner2.address, owner3.address],
      REQUIRED
    );

    // Fund the wallet with 10 ETH
    await owner1.sendTransaction({
      to: wallet.target,
      value: ethers.parseEther("10"),
    });
  });

  // ═══════════════════ Deployment & Initialization ═══════════════

  describe("Deployment", function () {
    it("should set correct owners", async function () {
      const owners = await wallet.getOwners();
      expect(owners).to.deep.equal([
        owner1.address,
        owner2.address,
        owner3.address,
      ]);
    });

    it("should set correct required confirmations", async function () {
      expect(await wallet.required()).to.equal(REQUIRED);
    });

    it("should mark each address as owner", async function () {
      expect(await wallet.isOwner(owner1.address)).to.be.true;
      expect(await wallet.isOwner(owner2.address)).to.be.true;
      expect(await wallet.isOwner(owner3.address)).to.be.true;
      expect(await wallet.isOwner(nonOwner.address)).to.be.false;
    });

    it("should revert with zero owners", async function () {
      const Factory = await ethers.getContractFactory("MultiSigWallet");
      await expect(Factory.deploy([], 1)).to.be.revertedWith(
        "MultiSig: owners required"
      );
    });

    it("should revert with required = 0", async function () {
      const Factory = await ethers.getContractFactory("MultiSigWallet");
      await expect(
        Factory.deploy([owner1.address], 0)
      ).to.be.revertedWith("MultiSig: invalid required count");
    });

    it("should revert with required > owners", async function () {
      const Factory = await ethers.getContractFactory("MultiSigWallet");
      await expect(
        Factory.deploy([owner1.address], 2)
      ).to.be.revertedWith("MultiSig: invalid required count");
    });

    it("should revert with duplicate owners", async function () {
      const Factory = await ethers.getContractFactory("MultiSigWallet");
      await expect(
        Factory.deploy([owner1.address, owner1.address], 1)
      ).to.be.revertedWith("MultiSig: duplicate owner");
    });

    it("should revert with zero-address owner", async function () {
      const Factory = await ethers.getContractFactory("MultiSigWallet");
      await expect(
        Factory.deploy([ethers.ZeroAddress], 1)
      ).to.be.revertedWith("MultiSig: zero address owner");
    });
  });

  // ═══════════════════ Deposits ═════════════════════════════════

  describe("Deposits", function () {
    it("should accept Ether and emit Deposit event", async function () {
      const amount = ethers.parseEther("1");
      await expect(
        owner1.sendTransaction({ to: wallet.target, value: amount })
      ).to.emit(wallet, "Deposit");

      expect(await ethers.provider.getBalance(wallet.target)).to.equal(
        ethers.parseEther("11") // 10 from beforeEach + 1
      );
    });
  });

  // ═══════════════════ Submit Transaction ════════════════════════

  describe("Submit Transaction", function () {
    it("should allow owner to submit a tx", async function () {
      const tx = await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");

      await expect(tx).to.emit(wallet, "TransactionSubmitted");
      expect(await wallet.getTransactionCount()).to.equal(1);
    });

    it("should store correct tx data", async function () {
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("2"), "0x");

      const txn = await wallet.getTransaction(0);
      expect(txn.to).to.equal(recipient.address);
      expect(txn.value).to.equal(ethers.parseEther("2"));
      expect(txn.executed).to.be.false;
      expect(txn.confirmationCount).to.equal(0);
    });

    it("should revert if non-owner submits", async function () {
      await expect(
        wallet
          .connect(nonOwner)
          .submitTransaction(recipient.address, ethers.parseEther("1"), "0x")
      ).to.be.revertedWith("MultiSig: caller is not owner");
    });
  });

  // ═══════════════════ Confirm Transaction ══════════════════════

  describe("Confirm Transaction", function () {
    beforeEach(async function () {
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
    });

    it("should allow an owner to confirm", async function () {
      await expect(wallet.connect(owner1).confirmTransaction(0)).to.emit(
        wallet,
        "TransactionConfirmed"
      );

      const txn = await wallet.getTransaction(0);
      expect(txn.confirmationCount).to.equal(1);
      expect(await wallet.isConfirmed(0, owner1.address)).to.be.true;
    });

    it("should revert on duplicate confirmation", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      await expect(
        wallet.connect(owner1).confirmTransaction(0)
      ).to.be.revertedWith("MultiSig: tx already confirmed by caller");
    });

    it("should revert for non-owner", async function () {
      await expect(
        wallet.connect(nonOwner).confirmTransaction(0)
      ).to.be.revertedWith("MultiSig: caller is not owner");
    });

    it("should revert for non-existent tx", async function () {
      await expect(
        wallet.connect(owner1).confirmTransaction(99)
      ).to.be.revertedWith("MultiSig: tx does not exist");
    });
  });

  // ═══════════════════ Execute Transaction ══════════════════════

  describe("Execute Transaction", function () {
    beforeEach(async function () {
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
    });

    it("should execute after reaching required confirmations", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      await wallet.connect(owner2).confirmTransaction(0);

      const balBefore = await ethers.provider.getBalance(recipient.address);

      await expect(wallet.connect(owner1).executeTransaction(0)).to.emit(
        wallet,
        "TransactionExecuted"
      );

      const balAfter = await ethers.provider.getBalance(recipient.address);
      expect(balAfter - balBefore).to.equal(ethers.parseEther("1"));

      const txn = await wallet.getTransaction(0);
      expect(txn.executed).to.be.true;
    });

    it("should revert without enough confirmations", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      // Only 1 of 2 required
      await expect(
        wallet.connect(owner1).executeTransaction(0)
      ).to.be.revertedWith("MultiSig: not enough confirmations");
    });

    it("should revert if already executed", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      await wallet.connect(owner2).confirmTransaction(0);
      await wallet.connect(owner1).executeTransaction(0);

      await expect(
        wallet.connect(owner1).executeTransaction(0)
      ).to.be.revertedWith("MultiSig: tx already executed");
    });

    it("should revert for non-owner", async function () {
      await wallet.connect(owner1).confirmTransaction(0);
      await wallet.connect(owner2).confirmTransaction(0);
      await expect(
        wallet.connect(nonOwner).executeTransaction(0)
      ).to.be.revertedWith("MultiSig: caller is not owner");
    });
  });

  // ═══════════════════ Revoke Confirmation ══════════════════════

  describe("Revoke Confirmation", function () {
    beforeEach(async function () {
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).confirmTransaction(0);
    });

    it("should allow revoking a confirmation", async function () {
      await expect(wallet.connect(owner1).revokeConfirmation(0)).to.emit(
        wallet,
        "ConfirmationRevoked"
      );

      const txn = await wallet.getTransaction(0);
      expect(txn.confirmationCount).to.equal(0);
      expect(await wallet.isConfirmed(0, owner1.address)).to.be.false;
    });

    it("should revert if not previously confirmed", async function () {
      await expect(
        wallet.connect(owner2).revokeConfirmation(0)
      ).to.be.revertedWith("MultiSig: tx not confirmed by caller");
    });

    it("should prevent execution after revoke drops below threshold", async function () {
      await wallet.connect(owner2).confirmTransaction(0);
      // Now 2 confirmations — revoke one
      await wallet.connect(owner1).revokeConfirmation(0);

      await expect(
        wallet.connect(owner1).executeTransaction(0)
      ).to.be.revertedWith("MultiSig: not enough confirmations");
    });
  });

  // ═══════════════════ Owner Management ═════════════════════════

  describe("Owner Management (via wallet)", function () {
    async function submitAndExecuteWalletTx(data) {
      await wallet.connect(owner1).submitTransaction(wallet.target, 0, data);
      const txId = (await wallet.getTransactionCount()) - 1n;
      await wallet.connect(owner1).confirmTransaction(txId);
      await wallet.connect(owner2).confirmTransaction(txId);
      await wallet.connect(owner1).executeTransaction(txId);
    }

    it("should add a new owner via multi-sig tx", async function () {
      const data = wallet.interface.encodeFunctionData("addOwner", [
        nonOwner.address,
      ]);
      await submitAndExecuteWalletTx(data);

      expect(await wallet.isOwner(nonOwner.address)).to.be.true;
      const owners = await wallet.getOwners();
      expect(owners.length).to.equal(4);
    });

    it("should remove an owner via multi-sig tx", async function () {
      const data = wallet.interface.encodeFunctionData("removeOwner", [
        owner3.address,
      ]);
      await submitAndExecuteWalletTx(data);

      expect(await wallet.isOwner(owner3.address)).to.be.false;
      const owners = await wallet.getOwners();
      expect(owners.length).to.equal(2);
    });

    it("should lower required when removing owner makes it exceed count", async function () {
      // Deploy a 2-of-2 wallet
      const Factory = await ethers.getContractFactory("MultiSigWallet");
      const w2 = await Factory.deploy(
        [owner1.address, owner2.address],
        2
      );

      // Remove owner2 via multi-sig
      const data = w2.interface.encodeFunctionData("removeOwner", [
        owner2.address,
      ]);
      await w2.connect(owner1).submitTransaction(w2.target, 0, data);
      await w2.connect(owner1).confirmTransaction(0);
      await w2.connect(owner2).confirmTransaction(0);
      await w2.connect(owner1).executeTransaction(0);

      expect(await w2.required()).to.equal(1);
    });

    it("should change requirement via multi-sig tx", async function () {
      const data = wallet.interface.encodeFunctionData("changeRequirement", [
        3,
      ]);
      await submitAndExecuteWalletTx(data);

      expect(await wallet.required()).to.equal(3);
    });

    it("should revert addOwner if not called by wallet", async function () {
      await expect(
        wallet.connect(owner1).addOwner(nonOwner.address)
      ).to.be.revertedWith("MultiSig: caller is not wallet");
    });
  });

  // ═══════════════════ Edge Cases ═══════════════════════════════

  describe("Edge Cases", function () {
    it("should handle multiple pending transactions", async function () {
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("2"), "0x");

      expect(await wallet.getTransactionCount()).to.equal(2);

      // Confirm and execute second tx first
      await wallet.connect(owner1).confirmTransaction(1);
      await wallet.connect(owner2).confirmTransaction(1);
      await wallet.connect(owner1).executeTransaction(1);

      const txn1 = await wallet.getTransaction(1);
      expect(txn1.executed).to.be.true;

      const txn0 = await wallet.getTransaction(0);
      expect(txn0.executed).to.be.false;
    });

    it("should revert execution when wallet has insufficient balance", async function () {
      await wallet
        .connect(owner1)
        .submitTransaction(
          recipient.address,
          ethers.parseEther("999"),
          "0x"
        );
      await wallet.connect(owner1).confirmTransaction(0);
      await wallet.connect(owner2).confirmTransaction(0);

      await expect(
        wallet.connect(owner1).executeTransaction(0)
      ).to.be.revertedWith("MultiSig: tx execution failed");
    });

    it("should not allow confirming an already-executed tx", async function () {
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).confirmTransaction(0);
      await wallet.connect(owner2).confirmTransaction(0);
      await wallet.connect(owner1).executeTransaction(0);

      await expect(
        wallet.connect(owner3).confirmTransaction(0)
      ).to.be.revertedWith("MultiSig: tx already executed");
    });
  });
});
