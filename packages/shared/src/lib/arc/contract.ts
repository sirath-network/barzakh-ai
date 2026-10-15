import { parseAbi } from "viem";
export const arcPaymentAbi = parseAbi([
	"function pay(bytes32 commitment, uint256 expiresAt) payable",
	"function merchant() view returns (address)",
	"function PRICE() view returns (uint256)",
	"function paid(address payer, bytes32 commitment) view returns (bool)",
	"event InvoicePaid(bytes32 indexed commitment, address indexed payer, address indexed merchant, uint256 amount, uint256 expiresAt)",
]);
