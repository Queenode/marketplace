// ─────────────────────────────────────────────────────────────
// lib/config.ts — centralised runtime configuration
// ─────────────────────────────────────────────────────────────

export const config = {
  contractId: process.env.NEXT_PUBLIC_CONTRACT_ID ?? "",
  launchpadContractId: process.env.NEXT_PUBLIC_LAUNCHPAD_CONTRACT_ID ?? "",
  network: process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet",
  rpcUrl:
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
    "https://soroban-testnet.stellar.org",
  horizonUrl:
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ??
    "https://horizon-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
    "Test SDF Network ; September 2015",
  pinataGateway:
    process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud",
} as const;

export function assertConfig() {
  const missing: string[] = [];
  if (!config.contractId) missing.push("NEXT_PUBLIC_CONTRACT_ID");
  if (!config.launchpadContractId) missing.push("NEXT_PUBLIC_LAUNCHPAD_CONTRACT_ID");
  if (missing.length > 0) {
    console.warn(
      `[Afristore] Missing environment variables: ${missing.join(", ")}`
    );
  }
}
