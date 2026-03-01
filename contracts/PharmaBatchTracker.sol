// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title PharmaBatchTracker
 * @notice Decentralized custody-tracking system for pharmaceutical batches.
 * @dev Provides batch registration, ownership transfer, recall, and verification
 *      without any NFT/ERC721 or payment/escrow logic. Designed as a research-grade
 *      supply-chain prototype demonstrating tamper-resistant provenance on Ethereum.
 *
 * Roles:
 *   - Manufacturer: registers batches and can initiate recalls.
 *   - Distributor / Retailer: receive custody via transferBatch.
 *   - Public: can verify authenticity and recall status via verifyBatch.
 *
 * Security considerations addressed in-contract:
 *   - Duplicate registration prevention (batchExists modifier).
 *   - Only current owner may transfer custody (onlyCurrentOwner modifier).
 *   - Recall is irreversible and restricted to the original manufacturer.
 *   - All state transitions emit indexed events for off-chain audit trail.
 */
contract PharmaBatchTracker {

    // ──────────────────────────────────────────────
    //  Data Structures
    // ──────────────────────────────────────────────

    struct Batch {
        address manufacturer;    // Original registrant — immutable after registration
        address currentOwner;    // Current custodian of the batch
        bytes32 metadataHash;    // Keccak-256 hash of off-chain metadata (drug name, dosage, expiry, etc.)
        bool    recalled;        // Recall flag — once set, cannot be unset
    }

    /// @notice Primary storage: batchID → Batch struct
    mapping(bytes32 => Batch) public batches;

    /// @notice Custody history per batch — append-only log of successive owners
    mapping(bytes32 => address[]) public custodyHistory;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when a new batch is registered on-chain
    event BatchRegistered(
        bytes32 indexed batchID,
        address indexed manufacturer,
        bytes32 metadataHash,
        uint256 timestamp
    );

    /// @notice Emitted when custody of a batch is transferred
    event BatchTransferred(
        bytes32 indexed batchID,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    /// @notice Emitted when a batch is recalled by the manufacturer
    event BatchRecalled(
        bytes32 indexed batchID,
        address indexed manufacturer,
        uint256 timestamp
    );

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    /// @dev Ensures the batch has been registered
    modifier batchExists(bytes32 _batchID) {
        require(
            batches[_batchID].manufacturer != address(0),
            "PharmaBatchTracker: batch does not exist"
        );
        _;
    }

    /// @dev Restricts to the original manufacturer of a batch
    modifier onlyManufacturer(bytes32 _batchID) {
        require(
            msg.sender == batches[_batchID].manufacturer,
            "PharmaBatchTracker: caller is not the manufacturer"
        );
        _;
    }

    /// @dev Restricts to the current custodian of a batch
    modifier onlyCurrentOwner(bytes32 _batchID) {
        require(
            msg.sender == batches[_batchID].currentOwner,
            "PharmaBatchTracker: caller is not the current owner"
        );
        _;
    }

    // ──────────────────────────────────────────────
    //  Core Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Register a new pharmaceutical batch on-chain.
     * @param _batchID   Unique identifier for the batch (e.g., keccak256 of lot number).
     * @param _metadataHash  Keccak-256 hash of off-chain metadata JSON (drug name, dosage, expiry, etc.).
     * @dev Reverts if batchID is already registered. The caller becomes both the manufacturer
     *      and the initial current owner.
     */
    function registerBatch(bytes32 _batchID, bytes32 _metadataHash) external {
        require(
            batches[_batchID].manufacturer == address(0),
            "PharmaBatchTracker: batch already registered"
        );

        batches[_batchID] = Batch({
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            metadataHash: _metadataHash,
            recalled: false
        });

        custodyHistory[_batchID].push(msg.sender);

        emit BatchRegistered(_batchID, msg.sender, _metadataHash, block.timestamp);
    }

    /**
     * @notice Transfer custody of a batch to a new owner.
     * @param _batchID   The batch to transfer.
     * @param _newOwner  Address of the new custodian (e.g., distributor or retailer).
     * @dev Only the current owner may call. Updates ownership and appends to custody history.
     */
    function transferBatch(bytes32 _batchID, address _newOwner)
        external
        batchExists(_batchID)
        onlyCurrentOwner(_batchID)
    {
        require(
            _newOwner != address(0),
            "PharmaBatchTracker: cannot transfer to zero address"
        );
        require(
            _newOwner != msg.sender,
            "PharmaBatchTracker: cannot transfer to self"
        );

        address previousOwner = batches[_batchID].currentOwner;
        batches[_batchID].currentOwner = _newOwner;
        custodyHistory[_batchID].push(_newOwner);

        emit BatchTransferred(_batchID, previousOwner, _newOwner, block.timestamp);
    }

    /**
     * @notice Recall a batch — permanently flags it as recalled.
     * @param _batchID  The batch to recall.
     * @dev Only the original manufacturer may call. The recalled flag cannot be reversed.
     */
    function recallBatch(bytes32 _batchID)
        external
        batchExists(_batchID)
        onlyManufacturer(_batchID)
    {
        require(
            !batches[_batchID].recalled,
            "PharmaBatchTracker: batch already recalled"
        );

        batches[_batchID].recalled = true;

        emit BatchRecalled(_batchID, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify a batch's current status — public view.
     * @param _batchID  The batch to query.
     * @return manufacturer   Original registrant address.
     * @return currentOwner   Current custodian address.
     * @return metadataHash   Hash of off-chain metadata for integrity verification.
     * @return recalled       Whether the batch has been recalled.
     */
    function verifyBatch(bytes32 _batchID)
        external
        view
        batchExists(_batchID)
        returns (
            address manufacturer,
            address currentOwner,
            bytes32 metadataHash,
            bool    recalled
        )
    {
        Batch storage b = batches[_batchID];
        return (b.manufacturer, b.currentOwner, b.metadataHash, b.recalled);
    }

    /**
     * @notice Retrieve the full custody history of a batch.
     * @param _batchID  The batch to query.
     * @return owners   Ordered array of all custodians (index 0 = manufacturer).
     */
    function getCustodyHistory(bytes32 _batchID)
        external
        view
        batchExists(_batchID)
        returns (address[] memory owners)
    {
        return custodyHistory[_batchID];
    }

    /**
     * @notice Get the number of custody transfers for a batch.
     * @param _batchID  The batch to query.
     * @return count    Length of the custody history array.
     */
    function getCustodyCount(bytes32 _batchID)
        external
        view
        batchExists(_batchID)
        returns (uint256 count)
    {
        return custodyHistory[_batchID].length;
    }
}
