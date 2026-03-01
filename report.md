# Blockchain-Based Pharmaceutical Batch Traceability & Recall System

## 1. Problem Statement

Counterfeit pharmaceutical products infiltrate global supply chains at an alarming rate. The World Health Organization estimates that 1 in 10 medical products circulating in low- and middle-income countries is substandard or falsified. Traditional supply chain tracking relies on centralized databases that are vulnerable to:

- **Single points of failure** — a compromised central authority can alter records
- **Lack of inter-party trust** — manufacturers, distributors, and retailers maintain siloed systems
- **No immutable audit trail** — paper-based or ERP-based logs can be retroactively modified
- **Delayed recall execution** — without a shared ledger, recall notifications propagate slowly

This project proposes a decentralized, Ethereum-based custody-tracking system that provides tamper-resistant provenance for pharmaceutical batches from manufacturer to retailer.

---

## 2. Justification for Blockchain

Blockchain technology is uniquely suited to this problem because:

| Property | Benefit |
|---|---|
| **Immutability** | Once a batch registration or transfer is recorded, it cannot be altered or deleted |
| **Decentralized trust** | No single party controls the ledger; all participants share the same source of truth |
| **Transparency** | Any participant (including regulators) can verify batch authenticity in real time |
| **Event-driven audit** | Smart contract events provide a permanent, indexed log of all custody changes |
| **Permissionless verification** | Public `verifyBatch()` allows anyone to check recall status without special access |

### On-Chain vs. Off-Chain Storage

| Data | Storage | Rationale |
|---|---|---|
| Batch ID | On-chain | Unique identifier; must be globally verifiable |
| Manufacturer address | On-chain | Immutable provenance anchor |
| Current owner address | On-chain | Custody state must be authoritative |
| Metadata hash (keccak-256) | On-chain | Integrity verification without storing full data |
| Recall flag | On-chain | Must be tamper-resistant and publicly visible |
| Custody history | On-chain | Append-only chain of custody |
| Full metadata (drug name, dosage, NDC, expiry, site) | Off-chain | Too large/costly for on-chain; hash stored for integrity |

---

## 3. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Blockchain** | Ethereum (Hardhat Local Network) | Solidity ^0.8.17 |
| **Smart Contract Framework** | Hardhat | ^2.12.0 |
| **Frontend** | React.js | ^18.2.0 |
| **Blockchain Interaction** | Ethers.js | v5.7 |
| **Testing** | Chai + Hardhat Toolbox | ^2.0.0 |
| **Wallet** | MetaMask | Browser Extension |
| **Package Manager** | npm | — |

---

## 4. Project Structure

```
pharma-batch-tracker/
├── contracts/
│   └── PharmaBatchTracker.sol      # Core supply chain smart contract
├── scripts/
│   └── deploy.js                   # Deployment + demo data seeding
├── test/
│   └── PharmaBatchTracker.js       # 26 automated test cases
├── src/
│   ├── App.js                      # Main React application
│   ├── config.json                 # Deployed contract address config
│   ├── index.js                    # React entry point
│   ├── index.css                   # Global styles
│   ├── abis/
│   │   └── PharmaBatchTracker.json # Contract ABI
│   └── components/
│       ├── Navigation.js           # Top navigation with wallet connect
│       ├── RegisterBatch.js        # Batch registration form
│       ├── TransferBatch.js        # Custody transfer form
│       ├── VerifyBatch.js          # Verification + custody chain display
│       ├── RecallBatch.js          # Recall initiation (manufacturer only)
│       └── EventLog.js             # On-chain event audit trail
├── hardhat.config.js
├── package.json
└── report.md                       # This document
```

---

## 5. Smart Contract: PharmaBatchTracker

### 5.1 Data Structures

```solidity
struct Batch {
    address manufacturer;    // Original registrant — immutable after creation
    address currentOwner;    // Current custodian
    bytes32 metadataHash;    // keccak-256 hash of off-chain metadata
    bool    recalled;        // Recall flag — irreversible once set
}

mapping(bytes32 => Batch) public batches;
mapping(bytes32 => address[]) public custodyHistory;
```

### 5.2 Functions

| Function | Access | Description |
|---|---|---|
| `registerBatch(batchID, metadataHash)` | Any address (becomes manufacturer) | Registers a new batch; prevents duplicates |
| `transferBatch(batchID, newOwner)` | Current owner only | Transfers custody; appends to history; emits event |
| `recallBatch(batchID)` | Manufacturer only | Permanently flags batch as recalled |
| `verifyBatch(batchID)` | Public (view) | Returns manufacturer, owner, hash, recall status |
| `getCustodyHistory(batchID)` | Public (view) | Returns full ordered array of custodians |
| `getCustodyCount(batchID)` | Public (view) | Returns number of custody entries |

### 5.3 Events

```solidity
event BatchRegistered(bytes32 indexed batchID, address indexed manufacturer, bytes32 metadataHash, uint256 timestamp);
event BatchTransferred(bytes32 indexed batchID, address indexed from, address indexed to, uint256 timestamp);
event BatchRecalled(bytes32 indexed batchID, address indexed manufacturer, uint256 timestamp);
```

### 5.4 Access Modifiers

- `batchExists(batchID)` — reverts if batch not registered
- `onlyManufacturer(batchID)` — restricts to original registrant
- `onlyCurrentOwner(batchID)` — restricts to current custodian

---

## 6. Supply Chain Flow

```
┌──────────────┐    registerBatch()    ┌─────────────────────┐
│ Manufacturer │ ────────────────────> │  On-Chain Batch      │
│              │                       │  (manufacturer=self)  │
└──────┬───────┘                       └─────────────────────┘
       │
       │ transferBatch(distributor)
       ▼
┌──────────────┐                       ┌─────────────────────┐
│ Distributor  │ ────────────────────> │  currentOwner =      │
│              │  transferBatch(ret.)   │  distributor         │
└──────┬───────┘                       └─────────────────────┘
       │
       │ transferBatch(retailer)
       ▼
┌──────────────┐                       ┌─────────────────────┐
│  Retailer    │                       │  currentOwner =      │
│              │                       │  retailer            │
└──────────────┘                       └─────────────────────┘

At any point:
  - Manufacturer calls recallBatch() → recalled = true (permanent)
  - Anyone calls verifyBatch() → returns full status
```

---

## 7. Frontend Architecture

The React frontend provides five operational panels:

1. **Verify Batch** — Public lookup by lot number; displays owner, manufacturer, recall status, metadata hash, and full custody chain
2. **Register Batch** — Form for manufacturer to register new batch with drug name, NDC, expiry, and manufacturing site
3. **Transfer Custody** — Form for current owner to transfer batch to a new address
4. **Recall Batch** — Manufacturer-only panel to permanently flag a batch as recalled
5. **Event Log** — Real-time audit trail derived from on-chain `BatchRegistered`, `BatchTransferred`, and `BatchRecalled` events

All interactions use Ethers.js to communicate with the Hardhat local node. MetaMask wallet connection enables role-based transaction signing.

---

## 8. Security Analysis

### 8.1 Access Control Guarantees

| Threat | Mitigation |
|---|---|
| Unauthorized batch transfer | `onlyCurrentOwner` modifier reverts if caller != currentOwner |
| Duplicate batch registration | `registerBatch` checks `manufacturer != address(0)` |
| Unauthorized recall | `onlyManufacturer` modifier reverts if caller != original registrant |
| Recall reversal | No function exists to unset `recalled`; flag is permanent |
| Transfer to zero address | Explicit `require(_newOwner != address(0))` check |
| Self-transfer | Explicit `require(_newOwner != msg.sender)` check |

### 8.2 Potential Vulnerabilities

| Vulnerability | Description | Severity |
|---|---|---|
| **Front-running** | A miner or MEV bot could observe a `transferBatch` transaction in the mempool and attempt to front-run it. Mitigated in production by using commit-reveal schemes or private mempools. | Medium |
| **Private key compromise** | If a manufacturer's private key is compromised, an attacker could register fraudulent batches or initiate false recalls. Requires hardware wallet usage and multi-sig governance in production. | High |
| **Gas cost scaling** | Each custody transfer costs gas. For high-volume pharmaceutical supply chains (millions of batches), Layer 1 Ethereum is cost-prohibitive. Layer 2 rollups or permissioned chains (Hyperledger Besu) are recommended. | Medium |
| **Public chain privacy** | All batch data (addresses, transfer history) is publicly visible on-chain. Competitors could analyze supply chain patterns. Production deployment should use a permissioned network or zero-knowledge proofs. | Medium |
| **Off-chain metadata integrity** | The contract only stores a hash of the metadata. If the off-chain storage is compromised, the metadata may be lost (though the hash allows tampering detection). | Low |

---

## 9. Test Suite

The project includes **26 passing tests** covering all contract functionality:

| Category | Tests | Description |
|---|---|---|
| **Deployment** | 1 | Verifies contract deploys with valid address |
| **Batch Registration** | 5 | Registration, event emission, custody init, duplicate prevention |
| **Batch Transfer** | 8 | Ownership update, event emission, history append, multi-hop, access control, edge cases |
| **Batch Recall** | 5 | Recall flag, event emission, access control, double-recall prevention, post-transfer recall |
| **Batch Verification** | 5 | Correct details, updated owner, recall status, public access, non-existent batch |
| **Custody History** | 2 | Count tracking, ordered chain integrity |

Run with: `npx hardhat test`

---

## 10. User Roles, Wallet Addresses & Private Keys

The system defines three supply chain participant roles. On the Hardhat local network, each role is mapped to one of the default test accounts.

### 10.1 Role Descriptions

| Role | Account # | Description |
|---|---|---|
| **Manufacturer** | #0 | Registers new pharmaceutical batches on-chain via `registerBatch()`. The caller automatically becomes the immutable manufacturer of that batch. Only the manufacturer can issue a recall via `recallBatch()`. |
| **Distributor** | #1 | Receives batches from manufacturers and forwards them further along the supply chain. Acts as the intermediary logistics layer. Appears in the custody history of every batch they handle. |
| **Retailer** | #2 | End-point participant in the supply chain. Receives batches from distributors for dispensing to consumers. Can verify batch authenticity and recall status before dispensing. |
| **Unauthorized** | #3 | Used in tests to verify access control. Has no special privileges and is prevented from transferring or recalling batches they do not own/manufacture. |

### 10.2 Wallet Addresses

| Role | Address |
|---|---|
| Manufacturer | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| Distributor | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| Retailer | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| Unauthorized | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |

### 10.3 Private Keys (for MetaMask Import)

| Role | Private Key |
|---|---|
| Manufacturer | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| Distributor | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| Retailer | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| Unauthorized | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

> **WARNING:** These are publicly known Hardhat test accounts. Each account is pre-funded with 10,000 ETH on the local network. **Never send real funds to these addresses.**

### 10.4 Access Control Summary

| Action | Who Can Call | Modifier Used |
|---|---|---|
| Register a new batch | Any address (caller becomes manufacturer) | — |
| Transfer batch custody | Current owner only | `onlyCurrentOwner` |
| Recall a batch | Original manufacturer only | `onlyManufacturer` |
| Verify batch details | Anyone (public, read-only) | — |
| View custody history | Anyone (public, read-only) | — |

### 10.5 Seeded Demo Data (After Deployment)

The deploy script seeds three demo batches for testing. Below is their state after deployment:

| Lot Number | Drug Name | Manufacturer | Current Owner | Custody Chain | Status |
|---|---|---|---|---|---|
| `BATCH-AMX-2026-001` | Amoxicillin 500mg | `0xf39F...2266` (Manufacturer) | `0x3C44...93BC` (Retailer) | Manufacturer → Distributor → Retailer | **Active** |
| `BATCH-MET-2026-002` | Metformin 850mg | `0xf39F...2266` (Manufacturer) | `0x7099...79C8` (Distributor) | Manufacturer → Distributor | **Active** |
| `BATCH-PCM-2026-003` | Paracetamol 650mg | `0xf39F...2266` (Manufacturer) | `0xf39F...2266` (Manufacturer) | Manufacturer only | **RECALLED** |

---

## 11. Deployed Contract Address (Localhost)

| Contract | Address |
|---|---|
| PharmaBatchTracker | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |

---

## 12. Recall Mechanism Significance

The recall mechanism is a critical safety feature in pharmaceutical supply chains:

1. **Permanence** — The `recalled` flag cannot be unset. This ensures that once a safety issue is identified, it remains visible to all supply chain participants forever.
2. **Authority** — Only the original manufacturer can initiate a recall, preventing unauthorized disruption.
3. **Visibility** — The `BatchRecalled` event is emitted with a timestamp, creating a publicly auditable record of when the recall was initiated.
4. **Downstream protection** — Retailers and dispensaries can verify recall status before dispensing, preventing patient exposure to compromised medications.
5. **Regulatory compliance** — The immutable recall record can serve as evidence for regulatory audits (e.g., FDA, EMA).

---

## 13. Limitations

| Limitation | Description |
|---|---|
| **Local network only** | Currently runs on Hardhat's local blockchain; not deployed to testnet/mainnet |
| **No real identity verification** | Addresses are not KYC-verified; in production, role assignment requires governance |
| **Gas costs** | Each state change costs gas; not viable at scale on Ethereum L1 |
| **Public visibility** | All data is visible on-chain; no privacy-preserving mechanisms implemented |
| **Single contract** | All logic in one contract; production systems should use proxy patterns for upgradability |
| **No off-chain storage integration** | Metadata is hashed but no IPFS/Arweave integration for storage |
| **No multi-sig governance** | Manufacturer role is a single EOA; production requires multi-sig or DAO governance |

---

## 14. Future Work

- **Permissioned chain deployment** (Hyperledger Besu / Polygon PoS) for reduced gas costs and controlled access
- **Zero-knowledge proofs** for privacy-preserving batch verification
- **Multi-signature manufacturer governance** to prevent single-key compromise
- **Oracle integration** for temperature/humidity IoT data from cold-chain logistics
- **ERC-1155 or soul-bound token** integration for batch certificates
- **Layer 2 rollup deployment** (Optimism/Arbitrum) for production-grade throughput

---

## 15. Architecture Diagram

```
┌──────────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  React Frontend  │────>│  Ethers.js   │────>│   Hardhat Node       │
│  (Browser)       │<────│  (Provider)  │<────│   (Local Blockchain) │
└──────────────────┘     └──────────────┘     └──────────────────────┘
                                                       │
                                              ┌────────┴────────┐
                                              │ PharmaBatch      │
                                              │ Tracker          │
                                              │ (Single Contract)│
                                              └────────┬────────┘
                                                       │
                                     ┌─────────────────┼─────────────────┐
                                     │                 │                 │
                              ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐
                              │ registerBatch│  │transferBatch│  │ recallBatch │
                              │ (Mfr only)  │  │(Owner only) │  │ (Mfr only)  │
                              └─────────────┘  └─────────────┘  └─────────────┘
                                                       │
                                              ┌────────┴────────┐
                                              │  verifyBatch()  │
                                              │  (Public View)  │
                                              └─────────────────┘
```

---

## 16. Setup & Installation

```bash
# 1. Install dependencies
npm install

# 2. Run smart contract tests (26 tests)
npx hardhat test

# 3. Start local Hardhat blockchain node
npx hardhat node

# 4. Deploy contracts (in a separate terminal)
npx hardhat run ./scripts/deploy.js --network localhost

# 5. Start the React frontend
npm run start
```

### MetaMask Setup

1. Install MetaMask browser extension
2. Add custom network:
   - **Network Name:** Localhost 8545
   - **RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH
3. Import test accounts using Hardhat default private keys
4. Connect to the dApp at http://localhost:3000

---

## 17. Conclusion

This prototype demonstrates a minimal but architecturally sound application of blockchain technology to pharmaceutical supply chain traceability. By replacing centralized databases with a shared, immutable ledger, the system provides:

- **Tamper-resistant provenance** for every pharmaceutical batch
- **Multi-party trust** without a central authority
- **Real-time recall propagation** across the entire supply chain
- **Public verifiability** for regulators, pharmacies, and consumers

The system is designed as a research-grade prototype and deliberately avoids NFT/marketplace patterns, focusing instead on the core supply-chain primitives of registration, custody transfer, recall, and verification.

---

*Report generated for PharmaBatchTracker — Blockchain-Based Pharmaceutical Batch Traceability & Recall System*
