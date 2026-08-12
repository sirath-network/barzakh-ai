// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlarePriceConsumer
 * @notice Consumes real-time decentralized price feeds from Flare Time Series Oracle (FTSOv2)
 * @dev Interacts with Flare Contract Registry to dynamically resolve TestFtsoV2 / FtsoV2
 */

interface IFlareContractRegistry {
    function getContractAddressByName(string memory _name) external view returns (address);
}

interface IFtsoV2 {
    function getFeedById(bytes21 _feedId) external view returns (uint256 _value, int8 _decimals, uint64 _timestamp);
    function getFeedsById(bytes21[] calldata _feedIds) external view returns (uint256[] memory _values, int8[] memory _decimals, uint64 _timestamp);
    function getFeedByIdInWei(bytes21 _feedId) external view returns (uint256 _value, uint64 _timestamp);
    function getFeedsByIdInWei(bytes21[] calldata _feedIds) external view returns (uint256[] memory _values, uint64 _timestamp);
}

contract FlarePriceConsumer {
    address public constant FLARE_CONTRACT_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;

    // Common FTSOv2 Feed IDs
    bytes21 public constant FLR_USD_FEED = 0x01464c522f55534400000000000000000000000000;
    bytes21 public constant XRP_USD_FEED = 0x015852502f55534400000000000000000000000000;
    bytes21 public constant BTC_USD_FEED = 0x014254432f55534400000000000000000000000000;
    bytes21 public constant ETH_USD_FEED = 0x014554482f55534400000000000000000000000000;

    event PriceQueried(bytes21 indexed feedId, uint256 value, int8 decimals, uint64 timestamp);

    function getFtsoV2Address() public view returns (address) {
        // Try TestFtsoV2 first for zero-gas testnet queries, fallback to FtsoV2
        address addr = IFlareContractRegistry(FLARE_CONTRACT_REGISTRY).getContractAddressByName("TestFtsoV2");
        if (addr == address(0)) {
            addr = IFlareContractRegistry(FLARE_CONTRACT_REGISTRY).getContractAddressByName("FtsoV2");
        }
        return addr;
    }

    /**
     * @notice Fetch real-time price for a specific FTSO feed
     */
    function getPrice(bytes21 _feedId) external view returns (uint256 value, int8 decimals, uint64 timestamp) {
        address ftsoAddr = getFtsoV2Address();
        require(ftsoAddr != address(0), "FTSO not resolved");
        return IFtsoV2(ftsoAddr).getFeedById(_feedId);
    }

    /**
     * @notice Fetch FLR/USD price
     */
    function getFlrUsdPrice() external view returns (uint256 value, int8 decimals, uint64 timestamp) {
        return this.getPrice(FLR_USD_FEED);
    }

    /**
     * @notice Fetch XRP/USD price for FXRP integrations
     */
    function getXrpUsdPrice() external view returns (uint256 value, int8 decimals, uint64 timestamp) {
        return this.getPrice(XRP_USD_FEED);
    }

    /**
     * @notice Fetch multiple benchmark prices in a single call
     */
    function getBenchmarkPrices() external view returns (
        uint256 flrPrice,
        uint256 xrpPrice,
        uint256 btcPrice,
        uint256 ethPrice,
        uint64 timestamp
    ) {
        address ftsoAddr = getFtsoV2Address();
        require(ftsoAddr != address(0), "FTSO not resolved");

        bytes21[] memory ids = new bytes21[](4);
        ids[0] = FLR_USD_FEED;
        ids[1] = XRP_USD_FEED;
        ids[2] = BTC_USD_FEED;
        ids[3] = ETH_USD_FEED;

        (uint256[] memory values, , uint64 ts) = IFtsoV2(ftsoAddr).getFeedsById(ids);
        return (values[0], values[1], values[2], values[3], ts);
    }
}
