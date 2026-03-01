const hre = require("hardhat");

async function main() {
  // Setup accounts — Hardhat provides 20 accounts by default
  // Account roles for this prototype:
  //   [0] Manufacturer
  //   [1] Distributor
  //   [2] Retailer
  const [manufacturer, distributor, retailer] = await ethers.getSigners();

  console.log("Deploying PharmaBatchTracker...");
  console.log(`  Manufacturer : ${manufacturer.address}`);
  console.log(`  Distributor  : ${distributor.address}`);
  console.log(`  Retailer     : ${retailer.address}`);
  console.log();

  // Deploy PharmaBatchTracker
  const PharmaBatchTracker = await ethers.getContractFactory("PharmaBatchTracker");
  const tracker = await PharmaBatchTracker.deploy();
  await tracker.deployed();

  console.log(`PharmaBatchTracker deployed at: ${tracker.address}`);
  console.log();

  // --- Seed demo data ---

  // Batch 1 — Amoxicillin
  const batchID1 = ethers.utils.id("BATCH-AMX-2026-001");
  const metadata1 = ethers.utils.id(JSON.stringify({
    drugName: "Amoxicillin 500mg",
    ndc: "0781-2613-01",
    lotNumber: "AMX2026001",
    expiryDate: "2027-06-30",
    manufacturingSite: "PharmaCo Plant A, Mumbai"
  }));

  let tx = await tracker.connect(manufacturer).registerBatch(batchID1, metadata1);
  await tx.wait();
  console.log("Registered Batch 1: Amoxicillin 500mg");

  // Transfer Batch 1: Manufacturer → Distributor
  tx = await tracker.connect(manufacturer).transferBatch(batchID1, distributor.address);
  await tx.wait();
  console.log("  Transferred Batch 1 → Distributor");

  // Transfer Batch 1: Distributor → Retailer
  tx = await tracker.connect(distributor).transferBatch(batchID1, retailer.address);
  await tx.wait();
  console.log("  Transferred Batch 1 → Retailer");

  // Batch 2 — Metformin
  const batchID2 = ethers.utils.id("BATCH-MET-2026-002");
  const metadata2 = ethers.utils.id(JSON.stringify({
    drugName: "Metformin 850mg",
    ndc: "0093-7214-01",
    lotNumber: "MET2026002",
    expiryDate: "2027-12-31",
    manufacturingSite: "PharmaCo Plant B, Hyderabad"
  }));

  tx = await tracker.connect(manufacturer).registerBatch(batchID2, metadata2);
  await tx.wait();
  console.log("Registered Batch 2: Metformin 850mg");

  // Transfer Batch 2: Manufacturer → Distributor
  tx = await tracker.connect(manufacturer).transferBatch(batchID2, distributor.address);
  await tx.wait();
  console.log("  Transferred Batch 2 → Distributor");

  // Batch 3 — Paracetamol (will be recalled)
  const batchID3 = ethers.utils.id("BATCH-PCM-2026-003");
  const metadata3 = ethers.utils.id(JSON.stringify({
    drugName: "Paracetamol 650mg",
    ndc: "0363-0109-01",
    lotNumber: "PCM2026003",
    expiryDate: "2027-03-15",
    manufacturingSite: "PharmaCo Plant C, Chennai"
  }));

  tx = await tracker.connect(manufacturer).registerBatch(batchID3, metadata3);
  await tx.wait();
  console.log("Registered Batch 3: Paracetamol 650mg");

  // Recall Batch 3
  tx = await tracker.connect(manufacturer).recallBatch(batchID3);
  await tx.wait();
  console.log("  RECALLED Batch 3 (contamination detected)");

  console.log();
  console.log("Deployment and seeding complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
