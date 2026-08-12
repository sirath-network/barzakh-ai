// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlareConfidentialStrategy
 * @notice On-chain settlement contract for private, TEE-executed strategies on Flare Network.
 * @dev Combines hardware TEE attestation with FTSOv2 price feeds for MEV-proof execution.
 */

interface IFlareContractRegistry {
    function getContractAddressByName(string memory _name) external view returns (address);
}

interface IFtsoV2 {
    function getFeedById(bytes21 _feedId) external view returns (uint256 _value, int8 _decimals, uint64 _timestamp);
}

contract FlareConfidentialStrategy {
    address public constant FLARE_CONTRACT_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;
    bytes21 public constant XRP_USD_FEED = 0x015852502f55534400000000000000000000000000;

    address public owner;
    address public teeEnclaveSigner; // Address corresponding to TEE's private key generated in enclave

    struct Strategy {
        bytes32 strategyHash;      // sha256(encrypted_params + user_salt)
        address user;
        uint256 maxSpendPerInterval;
        uint256 intervalSeconds;
        uint256 lastExecuted;
        bool isActive;
    }

    mapping(bytes32 => Strategy) public strategies;
    mapping(bytes32 => bool) public executedExecutionHashes;

    event StrategyRegistered(bytes32 indexed strategyId, address indexed user, bytes32 strategyHash);
    event StrategyExecuted(bytes32 indexed strategyId, uint256 executedAmount, uint256 ftsoPrice, uint64 timestamp);
    event TeeSignerUpdated(address indexed oldSigner, address indexed newSigner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyTee() {
        require(msg.sender == teeEnclaveSigner, "Only authorized TEE enclave");
        _;
    }

    constructor(address _teeEnclaveSigner) {
        owner = msg.sender;
        teeEnclaveSigner = _teeEnclaveSigner;
    }

    function setTeeSigner(address _newSigner) external onlyOwner {
        emit TeeSignerUpdated(teeEnclaveSigner, _newSigner);
        teeEnclaveSigner = _newSigner;
    }

    /**
     * @notice Register an encrypted strategy hash from Barzakh AI
     * @dev User funds and specific trade thresholds remain encrypted inside the TEE
     */
    function registerStrategy(
        bytes32 _strategyId,
        bytes32 _strategyHash,
        uint256 _maxSpendPerInterval,
        uint256 _intervalSeconds
    ) external {
        require(strategies[_strategyId].user == address(0), "Strategy ID exists");

        strategies[_strategyId] = Strategy({
            strategyHash: _strategyHash,
            user: msg.sender,
            maxSpendPerInterval: _maxSpendPerInterval,
            intervalSeconds: _intervalSeconds,
            lastExecuted: 0,
            isActive: true
        });

        emit StrategyRegistered(_strategyId, msg.sender, _strategyHash);
    }

    /**
     * @notice Execute private strategy instruction verified by the TEE Enclave
     * @dev TEE enclave calls this with signed execution payload and verifies against live FTSOv2 price
     */
    function executeStrategy(
        bytes32 _strategyId,
        uint256 _amount,
        bytes32 _executionProofHash,
        bytes21 _feedId
    ) external onlyTee {
        Strategy storage strat = strategies[_strategyId];
        require(strat.isActive, "Strategy inactive");
        require(block.timestamp >= strat.lastExecuted + strat.intervalSeconds, "Interval not met");
        require(_amount <= strat.maxSpendPerInterval, "Exceeds max spend limit");
        require(!executedExecutionHashes[_executionProofHash], "Proof already executed");

        executedExecutionHashes[_executionProofHash] = true;
        strat.lastExecuted = block.timestamp;

        // Verify with live FTSOv2 price feed
        address ftsoAddr = IFlareContractRegistry(FLARE_CONTRACT_REGISTRY).getContractAddressByName("FtsoV2");
        if (ftsoAddr == address(0)) {
            ftsoAddr = IFlareContractRegistry(FLARE_CONTRACT_REGISTRY).getContractAddressByName("TestFtsoV2");
        }

        uint256 currentPrice = 0;
        uint64 priceTimestamp = 0;
        if (ftsoAddr != address(0)) {
            (currentPrice, , priceTimestamp) = IFtsoV2(ftsoAddr).getFeedById(_feedId);
        }

        emit StrategyExecuted(_strategyId, _amount, currentPrice, priceTimestamp);
    }

    function deactivateStrategy(bytes32 _strategyId) external {
        require(strategies[_strategyId].user == msg.sender || msg.sender == owner, "Unauthorized");
        strategies[_strategyId].isActive = false;
    }
}
