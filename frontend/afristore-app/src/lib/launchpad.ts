import {
  Address,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { config } from "./config";
import { invokeContract } from "./contract";

// ── Types ─────────────────────────────────────────────────────

export type CollectionKind =
  | "Normal721"
  | "Normal1155"
  | "LazyMint721"
  | "LazyMint1155";

export interface CollectionRecord {
  address: string;
  kind: CollectionKind;
  creator: string;
}

export interface PlatformFee {
  receiver: string;
  bps: number;
}

// ── Parsing ───────────────────────────────────────────────────

function parseCollectionRecord(raw: any): CollectionRecord {
  // raw is from scValToNative
  return {
    address: (raw.address as Address).toString(),
    kind: String(raw.kind) as CollectionKind,
    creator: (raw.creator as Address).toString(),
  };
}

function toAddressScVal(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

// ── Launchpad Methods ─────────────────────────────────────────

/**
 * deploy_normal_721
 */
export async function deployNormal721(
  creatorPublicKey: string,
  currencyAddress: string,
  name: string,
  symbol: string,
  maxSupply: number,
  royaltyBps: number,
  royaltyReceiver: string,
  salt: Buffer // 32 bytes
): Promise<string> {
  const args: xdr.ScVal[] = [
    toAddressScVal(creatorPublicKey),
    toAddressScVal(currencyAddress),
    nativeToScVal(name, { type: "string" }),
    nativeToScVal(symbol, { type: "string" }),
    nativeToScVal(BigInt(maxSupply), { type: "u64" }),
    nativeToScVal(royaltyBps, { type: "u32" }),
    toAddressScVal(royaltyReceiver),
    nativeToScVal(Uint8Array.from(salt), { type: "bytes" }),
  ];

  const retVal = await invokeContract(
    creatorPublicKey,
    "deploy_normal_721",
    args,
    false,
    config.launchpadContractId
  );
  return (scValToNative(retVal) as Address).toString();
}

/**
 * deploy_normal_1155
 */
export async function deployNormal1155(
  creatorPublicKey: string,
  currencyAddress: string,
  name: string,
  royaltyBps: number,
  royaltyReceiver: string,
  salt: Buffer
): Promise<string> {
  const args: xdr.ScVal[] = [
    toAddressScVal(creatorPublicKey),
    toAddressScVal(currencyAddress),
    nativeToScVal(name, { type: "string" }),
    nativeToScVal(royaltyBps, { type: "u32" }),
    toAddressScVal(royaltyReceiver),
    nativeToScVal(Uint8Array.from(salt), { type: "bytes" }),
  ];

  const retVal = await invokeContract(
    creatorPublicKey,
    "deploy_normal_1155",
    args,
    false,
    config.launchpadContractId
  );
  return (scValToNative(retVal) as Address).toString();
}

/**
 * deploy_lazy_721
 */
export async function deployLazy721(
  creatorPublicKey: string,
  currencyAddress: string,
  creatorPubkeyBytes: Buffer, // 32 bytes
  name: string,
  symbol: string,
  maxSupply: number,
  royaltyBps: number,
  royaltyReceiver: string,
  salt: Buffer
): Promise<string> {
  const args: xdr.ScVal[] = [
    toAddressScVal(creatorPublicKey),
    toAddressScVal(currencyAddress),
    nativeToScVal(Uint8Array.from(creatorPubkeyBytes), { type: "bytes" }),
    nativeToScVal(name, { type: "string" }),
    nativeToScVal(symbol, { type: "string" }),
    nativeToScVal(BigInt(maxSupply), { type: "u64" }),
    nativeToScVal(royaltyBps, { type: "u32" }),
    toAddressScVal(royaltyReceiver),
    nativeToScVal(Uint8Array.from(salt), { type: "bytes" }),
  ];

  const retVal = await invokeContract(
    creatorPublicKey,
    "deploy_lazy_721",
    args,
    false,
    config.launchpadContractId
  );
  return (scValToNative(retVal) as Address).toString();
}

/**
 * deploy_lazy_1155
 */
export async function deployLazy1155(
  creatorPublicKey: string,
  currencyAddress: string,
  creatorPubkeyBytes: Buffer,
  name: string,
  royaltyBps: number,
  royaltyReceiver: string,
  salt: Buffer
): Promise<string> {
  const args: xdr.ScVal[] = [
    toAddressScVal(creatorPublicKey),
    toAddressScVal(currencyAddress),
    nativeToScVal(Uint8Array.from(creatorPubkeyBytes), { type: "bytes" }),
    nativeToScVal(name, { type: "string" }),
    nativeToScVal(royaltyBps, { type: "u32" }),
    toAddressScVal(royaltyReceiver),
    nativeToScVal(Uint8Array.from(salt), { type: "bytes" }),
  ];

  const retVal = await invokeContract(
    creatorPublicKey,
    "deploy_lazy_1155",
    args,
    false,
    config.launchpadContractId
  );
  return (scValToNative(retVal) as Address).toString();
}

/**
 * collections_by_creator
 */
export async function getCollectionsByCreator(
  creatorPublicKey: string
): Promise<CollectionRecord[]> {
  const DUMMY_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
  const args = [toAddressScVal(creatorPublicKey)];
  const retVal = await invokeContract(
    DUMMY_KEY,
    "collections_by_creator",
    args,
    true,
    config.launchpadContractId
  );
  const native = scValToNative(retVal) as any[];
  return native.map(parseCollectionRecord);
}

/**
 * all_collections
 */
export async function getAllCollections(): Promise<CollectionRecord[]> {
  const DUMMY_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
  const retVal = await invokeContract(
    DUMMY_KEY,
    "all_collections",
    [],
    true,
    config.launchpadContractId
  );
  const native = scValToNative(retVal) as any[];
  return native.map(parseCollectionRecord);
}

/**
 * collection_count
 */
export async function getCollectionCount(): Promise<number> {
  const DUMMY_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
  const retVal = await invokeContract(
    DUMMY_KEY,
    "collection_count",
    [],
    true,
    config.launchpadContractId
  );
  return Number(scValToNative(retVal));
}

/**
 * get_platform_fee
 */
export async function getPlatformFee(): Promise<PlatformFee> {
  const DUMMY_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
  const retVal = await invokeContract(
    DUMMY_KEY,
    "platform_fee",
    [],
    true,
    config.launchpadContractId
  );
  const native = scValToNative(retVal) as [Address, number];
  return {
    receiver: native[0].toString(),
    bps: Number(native[1]),
  };
}

// ── Collection-Specific Methods ───────────────────────────────

export interface CollectionMetadata {
  name: string;
  symbol: string;
  creator: string;
  totalSupply: number;
  maxSupply: number;
  royaltyBps: number;
  royaltyReceiver: string;
}

/**
 * Fetch metadata for any deployed collection (721 or 1155).
 */
export async function getCollectionMetadata(
  collectionAddress: string
): Promise<CollectionMetadata> {
  const DUMMY_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

  const [name, symbol, creator, totalSupply, maxSupply, royalty] =
    await Promise.all([
      invokeContract(DUMMY_KEY, "name", [], true, collectionAddress),
      invokeContract(DUMMY_KEY, "symbol", [], true, collectionAddress).catch(
        () => nativeToScVal("", { type: "string" })
      ), // 1155 might not have symbol
      invokeContract(DUMMY_KEY, "creator", [], true, collectionAddress),
      invokeContract(DUMMY_KEY, "total_supply", [], true, collectionAddress),
      invokeContract(DUMMY_KEY, "max_supply", [], true, collectionAddress),
      invokeContract(DUMMY_KEY, "royalty_info", [], true, collectionAddress),
    ]);

  const royaltyNative = scValToNative(royalty) as [Address, number];

  return {
    name: scValToNative(name) as string,
    symbol: scValToNative(symbol) as string,
    creator: (scValToNative(creator) as Address).toString(),
    totalSupply: Number(scValToNative(totalSupply)),
    maxSupply: Number(scValToNative(maxSupply)),
    royaltyBps: Number(royaltyNative[1]),
    royaltyReceiver: royaltyNative[0].toString(),
  };
}

/**
 * Mint a new NFT in a Normal 721 collection.
 */
export async function mint721(
  creatorPublicKey: string,
  collectionAddress: string,
  recipient: string,
  metadataCid: string
): Promise<number> {
  const args: xdr.ScVal[] = [
    toAddressScVal(recipient),
    nativeToScVal(metadataCid, { type: "string" }),
  ];

  const retVal = await invokeContract(
    creatorPublicKey,
    "mint",
    args,
    false,
    collectionAddress
  );
  return Number(scValToNative(retVal));
}
