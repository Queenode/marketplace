import { deployNormal721 } from "../lib/launchpad";
import { invokeContract } from "../lib/contract";
import { Address, xdr, scValToNative } from "@stellar/stellar-sdk";

// Mock invokeContract
jest.mock("../lib/contract", () => ({
  invokeContract: jest.fn(),
  getContract: jest.fn(),
}));

describe("Launchpad Client", () => {
  const mockCreator = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
  const mockCurrency = "GCNP7433B5WDTZ4TKK7LAK5HHL77C2G66ZQUWJIDLNCQY62A3L5Y6K7V";
  const mockRoyaltyReceiver = "GBVVRX6LJL6IULXID3UVDG6XN76SSTC57YV7S2TDCB3B367VY2Y7I76G";
  const mockSalt = Buffer.alloc(32, 1);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps deployNormal721 arguments correctly", async () => {
    (invokeContract as jest.Mock).mockResolvedValue(
      new Address(mockCreator).toScVal()
    );

    await deployNormal721(
      mockCreator,
      mockCurrency,
      "Test Collection",
      "TEST",
      1000,
      500,
      mockRoyaltyReceiver,
      mockSalt
    );

    expect(invokeContract).toHaveBeenCalledWith(
      mockCreator,
      "deploy_normal_721",
      expect.any(Array),
      false,
      expect.any(String)
    );

    const args = (invokeContract as jest.Mock).mock.calls[0][2] as xdr.ScVal[];
    
    // Check name
    expect(scValToNative(args[2])).toBe("Test Collection");
    // Check symbol
    expect(scValToNative(args[3])).toBe("TEST");
    // Check maxSupply
    expect(scValToNative(args[4])).toBe(1000n);
    // Check royaltyBps
    expect(scValToNative(args[5])).toBe(500);
    // Check salt
    expect(scValToNative(args[7])).toEqual(mockSalt);
  });

  it("handles errors from invokeContract", async () => {
    (invokeContract as jest.Mock).mockRejectedValue(new Error("Simulation failed"));

    await expect(
      deployNormal721(
        mockCreator,
        mockCurrency,
        "Test",
        "T",
        100,
        0,
        mockCreator,
        mockSalt
      )
    ).rejects.toThrow("Simulation failed");
  });
});
