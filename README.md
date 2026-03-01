# PharmaBatchTracker — Blockchain-Based Pharmaceutical Batch Traceability & Recall System

A research-grade decentralized prototype for tracking pharmaceutical batch custody across supply chain participants (Manufacturer → Distributor → Retailer) using Ethereum smart contracts.

## Technology Stack

- **Solidity ^0.8.17** — Smart contract (PharmaBatchTracker)
- **Hardhat** — Development framework, local blockchain, testing
- **Ethers.js v5** — Blockchain interaction
- **React 18** — Frontend UI
- **Chai** — Test assertions
- **MetaMask** — Wallet connection

## Architecture

No NFTs, no ERC721, no payment/escrow logic. A single `PharmaBatchTracker` contract provides:

- **Batch Registration** — Manufacturer registers a batch with a metadata hash
- **Custody Transfer** — Only current owner can transfer to next party
- **Batch Recall** — Only manufacturer can permanently flag a batch as recalled
- **Public Verification** — Anyone can verify authenticity, custody chain, and recall status
- **Event Logging** — All state changes emit indexed events for off-chain audit

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests (26 tests)
```bash
npx hardhat test
```

### 3. Start Local Blockchain
```bash
npx hardhat node
```

### 4. Deploy Contracts (separate terminal)
```bash
npx hardhat run ./scripts/deploy.js --network localhost
```

### 5. Start Frontend
```bash
npm run start
```

### MetaMask Setup

1. Add custom network: **Localhost 8545**, RPC: `http://127.0.0.1:8545`, Chain ID: `31337`
2. Import Hardhat test accounts using private keys
3. Connect at `http://localhost:3000`

## Test Accounts

| Role         | Account # | Address |
|---|---|---|
| Manufacturer | #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| Distributor  | #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| Retailer     | #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |

> These are publicly known Hardhat test accounts. Never send real funds.

## Project Structure

```
├── contracts/
│   └── PharmaBatchTracker.sol    # Core supply chain contract
├── scripts/
│   └── deploy.js                 # Deployment + demo data seeding
├── test/
│   └── PharmaBatchTracker.js     # 26 test cases
├── src/
│   ├── App.js                    # Main React app
│   ├── config.json               # Deployed contract address
│   ├── abis/
│   │   └── PharmaBatchTracker.json
│   └── components/
│       ├── Navigation.js         # Nav bar with wallet connect
│       ├── RegisterBatch.js      # Batch registration form
│       ├── TransferBatch.js      # Custody transfer form
│       ├── VerifyBatch.js        # Verification + custody chain display
│       ├── RecallBatch.js        # Recall initiation
│       └── EventLog.js           # On-chain event audit trail
├── hardhat.config.js
└── package.json
```