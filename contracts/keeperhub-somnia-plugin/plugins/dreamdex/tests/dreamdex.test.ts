import { dreamDexPlugin } from "../src/index";

describe("DreamDEX KeeperHub Plugin", () => {
  it("should declare correct plugin metadata", () => {
    expect(dreamDexPlugin.name).toBe("DreamDEX");
    expect(dreamDexPlugin.category).toBe("DeFi");
    expect(dreamDexPlugin.chains).toContain(50312); // Somnia Shannon Testnet
  });

  it("should have all required actions", () => {
    expect(dreamDexPlugin.actions.placeOrder).toBeDefined();
    expect(dreamDexPlugin.actions.redeemWinningTokens).toBeDefined();
    expect(dreamDexPlugin.actions.closePosition).toBeDefined();
    expect(dreamDexPlugin.actions.mintTokens).toBeDefined();
  });

  it("should have required reads and triggers", () => {
    expect(dreamDexPlugin.reads.getImpliedProbability).toBeDefined();
    expect(dreamDexPlugin.reads.getMarketStatus).toBeDefined();
    expect(dreamDexPlugin.triggers.onMarketResolved).toBeDefined();
  });

  it("should correctly format placeOrder inputs for UP side", async () => {
    const mockWrite = jest.fn().mockResolvedValue("0xmocktxhash");
    const ctx = { writeContract: mockWrite };

    await dreamDexPlugin.actions.placeOrder.handler(ctx, {
      poolAddress: "0x276f5834C407b5B1d1De943dEf367f33E33f6E3C",
      side: "UP",
      amount: "10000000", // 10 tUSDC
      maxSlippageBps: 500,
    });

    expect(mockWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "placeOrder",
        args: [0, BigInt(10000000), BigInt(500)],
      })
    );
  });

  it("should correctly format placeOrder inputs for DOWN side", async () => {
    const mockWrite = jest.fn().mockResolvedValue("0xmocktxhash");
    const ctx = { writeContract: mockWrite };

    await dreamDexPlugin.actions.placeOrder.handler(ctx, {
      poolAddress: "0x276f5834C407b5B1d1De943dEf367f33E33f6E3C",
      side: "DOWN",
      amount: "5000000",
    });

    expect(mockWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "placeOrder",
        args: [1, BigInt(5000000), BigInt(500)],
      })
    );
  });

  it("should correctly format redeemWinningTokens call", async () => {
    const mockWrite = jest.fn().mockResolvedValue("0xmocktxhash");
    const ctx = { writeContract: mockWrite };

    await dreamDexPlugin.actions.redeemWinningTokens.handler(ctx, {
      poolAddress: "0x276f5834C407b5B1d1De943dEf367f33E33f6E3C",
      account: "0x15b263cdCf21bb9cba53D12275CD66b05FCE14B8",
    });

    expect(mockWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "redeemWinningTokens",
        args: ["0x15b263cdCf21bb9cba53D12275CD66b05FCE14B8"],
      })
    );
  });
});
