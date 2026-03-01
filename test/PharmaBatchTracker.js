const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PharmaBatchTracker", function () {
  let tracker;
  let manufacturer, distributor, retailer, unauthorized;
  let batchID, metadataHash;

  beforeEach(async function () {
    [manufacturer, distributor, retailer, unauthorized] = await ethers.getSigners();

    const PharmaBatchTracker = await ethers.getContractFactory("PharmaBatchTracker");
    tracker = await PharmaBatchTracker.deploy();
    await tracker.deployed();

    // Standard test batch
    batchID = ethers.utils.id("BATCH-TEST-001");
    metadataHash = ethers.utils.id(JSON.stringify({
      drugName: "TestDrug 100mg",
      lotNumber: "TD001",
      expiryDate: "2027-12-31"
    }));
  });

  // ─────────────────────────────────────────────
  //  Deployment
  // ─────────────────────────────────────────────

  describe("Deployment", function () {
    it("deploys successfully with a valid address", async function () {
      expect(tracker.address).to.not.equal(ethers.constants.AddressZero);
    });
  });

  // ─────────────────────────────────────────────
  //  Batch Registration
  // ─────────────────────────────────────────────

  describe("Batch Registration", function () {
    it("allows manufacturer to register a new batch", async function () {
      const tx = await tracker.connect(manufacturer).registerBatch(batchID, metadataHash);
      await tx.wait();

      const batch = await tracker.batches(batchID);
      expect(batch.manufacturer).to.equal(manufacturer.address);
      expect(batch.currentOwner).to.equal(manufacturer.address);
      expect(batch.metadataHash).to.equal(metadataHash);
      expect(batch.recalled).to.equal(false);
    });

    it("emits BatchRegistered event with correct parameters", async function () {
      await expect(tracker.connect(manufacturer).registerBatch(batchID, metadataHash))
        .to.emit(tracker, "BatchRegistered")
        .withArgs(batchID, manufacturer.address, metadataHash, await getBlockTimestamp());
    });

    it("initializes custody history with manufacturer", async function () {
      await tracker.connect(manufacturer).registerBatch(batchID, metadataHash);
      const history = await tracker.getCustodyHistory(batchID);
      expect(history.length).to.equal(1);
      expect(history[0]).to.equal(manufacturer.address);
    });

    it("reverts on duplicate batch registration", async function () {
      await tracker.connect(manufacturer).registerBatch(batchID, metadataHash);

      await expect(
        tracker.connect(manufacturer).registerBatch(batchID, metadataHash)
      ).to.be.revertedWith("PharmaBatchTracker: batch already registered");
    });

    it("reverts on duplicate registration by a different account", async function () {
      await tracker.connect(manufacturer).registerBatch(batchID, metadataHash);

      await expect(
        tracker.connect(distributor).registerBatch(batchID, metadataHash)
      ).to.be.revertedWith("PharmaBatchTracker: batch already registered");
    });
  });

  // ─────────────────────────────────────────────
  //  Batch Transfer
  // ─────────────────────────────────────────────

  describe("Batch Transfer", function () {
    beforeEach(async function () {
      await tracker.connect(manufacturer).registerBatch(batchID, metadataHash);
    });

    it("allows current owner to transfer custody", async function () {
      await tracker.connect(manufacturer).transferBatch(batchID, distributor.address);
      const batch = await tracker.batches(batchID);
      expect(batch.currentOwner).to.equal(distributor.address);
    });

    it("emits BatchTransferred event", async function () {
      await expect(tracker.connect(manufacturer).transferBatch(batchID, distributor.address))
        .to.emit(tracker, "BatchTransferred")
        .withArgs(batchID, manufacturer.address, distributor.address, await getBlockTimestamp());
    });

    it("appends new owner to custody history", async function () {
      await tracker.connect(manufacturer).transferBatch(batchID, distributor.address);
      const history = await tracker.getCustodyHistory(batchID);
      expect(history.length).to.equal(2);
      expect(history[1]).to.equal(distributor.address);
    });

    it("supports multi-hop transfer: Manufacturer → Distributor → Retailer", async function () {
      await tracker.connect(manufacturer).transferBatch(batchID, distributor.address);
      await tracker.connect(distributor).transferBatch(batchID, retailer.address);

      const batch = await tracker.batches(batchID);
      expect(batch.currentOwner).to.equal(retailer.address);

      const history = await tracker.getCustodyHistory(batchID);
      expect(history.length).to.equal(3);
      expect(history[0]).to.equal(manufacturer.address);
      expect(history[1]).to.equal(distributor.address);
      expect(history[2]).to.equal(retailer.address);
    });

    it("reverts if non-owner attempts transfer", async function () {
      await expect(
        tracker.connect(unauthorized).transferBatch(batchID, distributor.address)
      ).to.be.revertedWith("PharmaBatchTracker: caller is not the current owner");
    });

    it("reverts transfer to zero address", async function () {
      await expect(
        tracker.connect(manufacturer).transferBatch(batchID, ethers.constants.AddressZero)
      ).to.be.revertedWith("PharmaBatchTracker: cannot transfer to zero address");
    });

    it("reverts transfer to self", async function () {
      await expect(
        tracker.connect(manufacturer).transferBatch(batchID, manufacturer.address)
      ).to.be.revertedWith("PharmaBatchTracker: cannot transfer to self");
    });

    it("reverts transfer for non-existent batch", async function () {
      const fakeBatchID = ethers.utils.id("BATCH-FAKE");
      await expect(
        tracker.connect(manufacturer).transferBatch(fakeBatchID, distributor.address)
      ).to.be.revertedWith("PharmaBatchTracker: batch does not exist");
    });
  });

  // ─────────────────────────────────────────────
  //  Batch Recall
  // ─────────────────────────────────────────────

  describe("Batch Recall", function () {
    beforeEach(async function () {
      await tracker.connect(manufacturer).registerBatch(batchID, metadataHash);
    });

    it("allows manufacturer to recall a batch", async function () {
      await tracker.connect(manufacturer).recallBatch(batchID);
      const batch = await tracker.batches(batchID);
      expect(batch.recalled).to.equal(true);
    });

    it("emits BatchRecalled event", async function () {
      await expect(tracker.connect(manufacturer).recallBatch(batchID))
        .to.emit(tracker, "BatchRecalled")
        .withArgs(batchID, manufacturer.address, await getBlockTimestamp());
    });

    it("reverts if non-manufacturer attempts recall", async function () {
      await expect(
        tracker.connect(distributor).recallBatch(batchID)
      ).to.be.revertedWith("PharmaBatchTracker: caller is not the manufacturer");
    });

    it("reverts on double recall", async function () {
      await tracker.connect(manufacturer).recallBatch(batchID);

      await expect(
        tracker.connect(manufacturer).recallBatch(batchID)
      ).to.be.revertedWith("PharmaBatchTracker: batch already recalled");
    });

    it("manufacturer can recall even after custody transfer", async function () {
      await tracker.connect(manufacturer).transferBatch(batchID, distributor.address);
      await tracker.connect(manufacturer).recallBatch(batchID);

      const batch = await tracker.batches(batchID);
      expect(batch.recalled).to.equal(true);
    });
  });

  // ─────────────────────────────────────────────
  //  Batch Verification
  // ─────────────────────────────────────────────

  describe("Batch Verification", function () {
    beforeEach(async function () {
      await tracker.connect(manufacturer).registerBatch(batchID, metadataHash);
    });

    it("returns correct batch details via verifyBatch", async function () {
      const [mfr, owner, hash, recalled] = await tracker.verifyBatch(batchID);
      expect(mfr).to.equal(manufacturer.address);
      expect(owner).to.equal(manufacturer.address);
      expect(hash).to.equal(metadataHash);
      expect(recalled).to.equal(false);
    });

    it("reflects updated owner after transfer", async function () {
      await tracker.connect(manufacturer).transferBatch(batchID, distributor.address);
      const [, owner, ,] = await tracker.verifyBatch(batchID);
      expect(owner).to.equal(distributor.address);
    });

    it("reflects recall status after recall", async function () {
      await tracker.connect(manufacturer).recallBatch(batchID);
      const [, , , recalled] = await tracker.verifyBatch(batchID);
      expect(recalled).to.equal(true);
    });

    it("anyone can call verifyBatch", async function () {
      const [mfr, , ,] = await tracker.connect(unauthorized).verifyBatch(batchID);
      expect(mfr).to.equal(manufacturer.address);
    });

    it("reverts verification for non-existent batch", async function () {
      const fakeBatchID = ethers.utils.id("BATCH-FAKE");
      await expect(
        tracker.verifyBatch(fakeBatchID)
      ).to.be.revertedWith("PharmaBatchTracker: batch does not exist");
    });
  });

  // ─────────────────────────────────────────────
  //  Custody History
  // ─────────────────────────────────────────────

  describe("Custody History", function () {
    beforeEach(async function () {
      await tracker.connect(manufacturer).registerBatch(batchID, metadataHash);
    });

    it("returns correct custody count", async function () {
      expect(await tracker.getCustodyCount(batchID)).to.equal(1);

      await tracker.connect(manufacturer).transferBatch(batchID, distributor.address);
      expect(await tracker.getCustodyCount(batchID)).to.equal(2);

      await tracker.connect(distributor).transferBatch(batchID, retailer.address);
      expect(await tracker.getCustodyCount(batchID)).to.equal(3);
    });

    it("maintains ordered custody chain", async function () {
      await tracker.connect(manufacturer).transferBatch(batchID, distributor.address);
      await tracker.connect(distributor).transferBatch(batchID, retailer.address);

      const history = await tracker.getCustodyHistory(batchID);
      expect(history).to.deep.equal([
        manufacturer.address,
        distributor.address,
        retailer.address
      ]);
    });
  });

  // ─────────────────────────────────────────────
  //  Helper: approximate block timestamp
  // ─────────────────────────────────────────────

  async function getBlockTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    // Return the timestamp of the *next* block (current + 1 second approx)
    // For event matching we use anyValue from chai-as-promised if needed,
    // but here we just return a number. Since the actual assertion uses the
    // emitted event, Hardhat's test runner matches by the mined block timestamp.
    // We use `anyValue` via a workaround:
    return block.timestamp + 1;
  }
});
