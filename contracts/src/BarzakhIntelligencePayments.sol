// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @notice Non-custodial invoice settlement using Arc's native USDC (18 decimals).
/// @dev A payment proves settlement, not delivery or accuracy of an AI response.
contract BarzakhIntelligencePayments {
    uint256 public constant PRICE = 0.002 ether;
    address payable public merchant;
    mapping(address => mapping(bytes32 => bool)) public paid;
    bool private entered;

    event InvoicePaid(bytes32 indexed commitment, address indexed payer, address indexed merchant, uint256 amount, uint256 expiresAt);
    error InvalidMerchant();
    error InvalidInvoice();
    error ExpiredInvoice();
    error IncorrectAmount();
    error AlreadyPaid();
    error ReentrantPayment();
    error MerchantTransferFailed();

    constructor(address payable merchant_) {
        if (merchant_ == address(0) || merchant_ == address(this)) revert InvalidMerchant();
        merchant = merchant_;
    }

    /// @dev The server authenticates the committed invoice before delivering analysis.
    /// Anyone may pay a commitment; only its bound payer can redeem it at the service.
    function pay(bytes32 commitment, uint256 expiresAt) external payable {
        if (entered) revert ReentrantPayment();
        if (commitment == bytes32(0)) revert InvalidInvoice();
        if (block.timestamp > expiresAt) revert ExpiredInvoice();
        if (msg.value != PRICE) revert IncorrectAmount();
        if (paid[msg.sender][commitment]) revert AlreadyPaid();
        entered = true;
        paid[msg.sender][commitment] = true;
        (bool success,) = merchant.call{value: msg.value}("");
        if (!success) revert MerchantTransferFailed();
        emit InvoicePaid(commitment, msg.sender, merchant, msg.value, expiresAt);
        entered = false;
    }
}
