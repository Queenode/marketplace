"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useWalletContext } from "@/context/WalletContext";
import {
  getCollectionMetadata,
  getCollectionRecordByAddress,
  mint1155New,
  mint721,
  parseLazy1155VoucherJson,
  parseLazy721VoucherJson,
  redeemLazy1155,
  redeemLazy721,
  CollectionRecord,
  CollectionMetadata,
} from "@/lib/launchpad";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

type TxPhase =
  | "idle"
  | "validating"
  | "signing"
  | "submitting"
  | "success"
  | "error";

export default function CollectionMintPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const { publicKey } = useWalletContext();
  const [record, setRecord] = useState<CollectionRecord | null | undefined>(
    undefined
  );
  const [metadata, setMetadata] = useState<CollectionMetadata | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadPhase, setLoadPhase] = useState(true);

  // Normal mint fields
  const [recipient, setRecipient] = useState("");
  const [metadataCid, setMetadataCid] = useState("");
  const [amount1155, setAmount1155] = useState("1");

  // Lazy redeem
  const [voucherJson, setVoucherJson] = useState("");
  const [signatureHex, setSignatureHex] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("1");

  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [resultDetail, setResultDetail] = useState<string | null>(null);

  const isLazy = useMemo(
    () =>
      record
        ? record.kind === "LazyMint721" || record.kind === "LazyMint1155"
        : null,
    [record]
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadPhase(true);
      setLoadError(null);
      try {
        const [r, m] = await Promise.all([
          getCollectionRecordByAddress(address),
          getCollectionMetadata(address),
        ]);
        if (cancel) return;
        setRecord(r);
        setMetadata(m);
        if (publicKey) {
          setRecipient((prev) => (prev ? prev : publicKey));
        }
        if (!r) {
          setLoadError("This contract is not registered in the launchpad index.");
        }
      } catch (e) {
        if (!cancel) {
          setLoadError(
            e instanceof Error ? e.message : "Failed to load collection"
          );
        }
      } finally {
        if (!cancel) setLoadPhase(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [address, publicKey]);

  const resetFlow = useCallback(() => {
    setTxPhase("idle");
    setTxMessage(null);
    setResultDetail(null);
  }, []);

  const runMintNormal721 = useCallback(async () => {
    if (!publicKey) {
      setTxMessage("Connect your wallet first.");
      setTxPhase("error");
      return;
    }
    if (metadata && publicKey !== metadata.creator) {
      setTxMessage("Only the collection creator can mint on this contract.");
      setTxPhase("error");
      return;
    }
    const to = recipient.trim();
    if (!to.startsWith("G") || to.length < 50) {
      setTxMessage("Enter a valid Stellar destination address for the recipient.");
      setTxPhase("error");
      return;
    }
    const uri = metadataCid.trim();
    if (!uri) {
      setTxMessage("Metadata URI (IPFS CID or full URL) is required.");
      setTxPhase("error");
      return;
    }
    setTxPhase("signing");
    setTxMessage(null);
    try {
      const id = await mint721(publicKey, address, to, uri);
      setResultDetail(`Minted token id ${id}.`);
      setTxPhase("success");
    } catch (e) {
      setTxMessage(
        e instanceof Error ? e.message : "Transaction failed. Try again."
      );
      setTxPhase("error");
    }
  }, [publicKey, metadata, recipient, metadataCid, address]);

  const runMintNormal1155 = useCallback(async () => {
    if (!publicKey) {
      setTxMessage("Connect your wallet first.");
      setTxPhase("error");
      return;
    }
    if (metadata && publicKey !== metadata.creator) {
      setTxMessage("Only the collection creator can mint on this contract.");
      setTxPhase("error");
      return;
    }
    const to = recipient.trim();
    if (!to.startsWith("G") || to.length < 50) {
      setTxMessage("Enter a valid recipient address.");
      setTxPhase("error");
      return;
    }
    const uri = metadataCid.trim();
    if (!uri) {
      setTxMessage("Metadata URI is required.");
      setTxPhase("error");
      return;
    }
    let amt: bigint;
    try {
      amt = BigInt(amount1155.trim() || "0");
      if (amt <= 0n) throw new Error("bad");
    } catch {
      setTxMessage("Amount must be a positive integer.");
      setTxPhase("error");
      return;
    }
    setTxPhase("signing");
    setTxMessage(null);
    try {
      const tid = await mint1155New(publicKey, address, to, amt, uri);
      setResultDetail(`Created token id ${tid} (and minted ${amt} unit(s)).`);
      setTxPhase("success");
    } catch (e) {
      setTxMessage(
        e instanceof Error ? e.message : "Transaction failed. Try again."
      );
      setTxPhase("error");
    }
  }, [publicKey, metadata, recipient, metadataCid, amount1155, address]);

  const runRedeem721 = useCallback(async () => {
    if (!publicKey) {
      setTxMessage("Connect your wallet first.");
      setTxPhase("error");
      return;
    }
    setTxPhase("validating");
    setTxMessage(null);
    let voucher;
    try {
      voucher = parseLazy721VoucherJson(voucherJson);
    } catch (e) {
      setTxMessage(e instanceof Error ? e.message : "Invalid voucher");
      setTxPhase("error");
      return;
    }
    if (!/^[0-9a-fA-F]{128}$/.test(signatureHex.trim())) {
      setTxMessage("Signature must be 128 hex characters (64 bytes).");
      setTxPhase("error");
      return;
    }
    setTxPhase("signing");
    try {
      const tokenId = await redeemLazy721(
        publicKey,
        address,
        voucher,
        signatureHex.trim()
      );
      setResultDetail(`Redeemed. Minted token id ${tokenId}.`);
      setTxPhase("success");
    } catch (e) {
      setTxMessage(
        e instanceof Error ? e.message : "Transaction failed. Try again."
      );
      setTxPhase("error");
    }
  }, [publicKey, voucherJson, signatureHex, address]);

  const runRedeem1155 = useCallback(async () => {
    if (!publicKey) {
      setTxMessage("Connect your wallet first.");
      setTxPhase("error");
      return;
    }
    setTxPhase("validating");
    setTxMessage(null);
    let voucher;
    try {
      voucher = parseLazy1155VoucherJson(voucherJson);
    } catch (e) {
      setTxMessage(e instanceof Error ? e.message : "Invalid voucher");
      setTxPhase("error");
      return;
    }
    if (!/^[0-9a-fA-F]{128}$/.test(signatureHex.trim())) {
      setTxMessage("Signature must be 128 hex characters (64 bytes).");
      setTxPhase("error");
      return;
    }
    let amt: bigint;
    try {
      amt = BigInt(redeemAmount.trim() || "0");
      if (amt <= 0n) throw new Error("bad");
    } catch {
      setTxMessage("Amount must be a positive integer.");
      setTxPhase("error");
      return;
    }
    setTxPhase("signing");
    try {
      await redeemLazy1155(
        publicKey,
        address,
        voucher,
        amt,
        signatureHex.trim()
      );
      setResultDetail(`Redeemed ${amt} unit(s) successfully.`);
      setTxPhase("success");
    } catch (e) {
      setTxMessage(
        e instanceof Error ? e.message : "Transaction failed. Try again."
      );
      setTxPhase("error");
    }
  }, [publicKey, voucherJson, signatureHex, redeemAmount, address]);

  const isBusy = txPhase === "signing" || txPhase === "validating";

  return (
    <main className="min-h-screen bg-brand-50/20">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4">
          <Link
            href={`/launchpad/collections/${address}`}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-brand-500 font-bold transition-colors mb-8 group"
          >
            <ArrowLeft size={20} />
            Back to collection
          </Link>

          {loadPhase ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-brand-500" size={40} />
              <p className="text-gray-500 font-inter">Loading collection…</p>
            </div>
          ) : loadError ? (
            <div
              className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center"
              role="alert"
            >
              <p className="text-red-700 font-bold font-display mb-2">Cannot mint</p>
              <p className="text-red-600/90 text-sm font-inter">{loadError}</p>
            </div>
          ) : !metadata || record === null ? null : (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-inter mb-1">
                  Collection
                </p>
                <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
                  {metadata.name}
                </h1>
                <p className="font-mono text-xs text-gray-500 break-all">
                  {address}
                </p>
                {record && (
                  <p className="mt-3 text-sm font-inter text-gray-600">
                    Type: <span className="font-bold">{record.kind}</span>
                    {isLazy
                      ? " — redeem a signed voucher as the buyer, or create vouchers off-chain as the creator."
                      : " — you must be the creator to mint new items."}
                  </p>
                )}
              </div>

              {txPhase === "success" && (
                <div
                  className="rounded-2xl border border-mint-500/30 bg-mint-50/50 p-6 flex gap-4"
                  role="status"
                >
                  <CheckCircle2 className="text-mint-500 shrink-0" size={28} />
                  <div>
                    <p className="font-bold text-gray-900 font-display">
                      Submitted successfully
                    </p>
                    {resultDetail && (
                      <p className="text-sm text-gray-700 font-inter mt-1">
                        {resultDetail}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={resetFlow}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-mint-500/15 px-4 py-2 text-sm font-bold text-mint-800 border border-mint-500/30"
                    >
                      <RefreshCw size={16} /> Start another
                    </button>
                  </div>
                </div>
              )}

              {(txPhase === "error" && txMessage) && (
                <div
                  className="rounded-2xl border border-red-200 bg-red-50 p-5 flex gap-3"
                  role="alert"
                >
                  <AlertCircle className="text-red-500 shrink-0" size={24} />
                  <div>
                    <p className="font-bold text-red-800 text-sm">Action failed</p>
                    <p className="text-sm text-red-700/90 font-inter mt-1">
                      {txMessage}
                    </p>
                    <button
                      type="button"
                      onClick={resetFlow}
                      className="mt-3 text-sm font-bold text-red-800 underline"
                    >
                      Dismiss and try again
                    </button>
                  </div>
                </div>
              )}

              {record && !isLazy && record.kind === "Normal721" && (
                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-4">
                  <h2 className="text-xl font-display font-bold text-gray-900">
                    Mint (721)
                  </h2>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Recipient
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-mono text-sm"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="G... destination"
                    disabled={isBusy}
                  />
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Metadata URI
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm"
                    value={metadataCid}
                    onChange={(e) => setMetadataCid(e.target.value)}
                    placeholder="ipfs://... or https://..."
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={runMintNormal721}
                    className="w-full rounded-2xl bg-brand-500 py-4 text-white font-bold hover:bg-brand-600 disabled:opacity-50 shadow-lg shadow-brand-500/20"
                  >
                    {isBusy ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={20} />
                        {txPhase === "validating" ? "Checking…" : "Sign in Freighter…"}
                      </span>
                    ) : (
                      "Mint NFT"
                    )}
                  </button>
                </div>
              )}

              {record && !isLazy && record.kind === "Normal1155" && (
                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-4">
                  <h2 className="text-xl font-display font-bold text-gray-900">
                    Mint (1155)
                  </h2>
                  <p className="text-sm text-gray-600 font-inter">
                    Mints a new token type via <code>mint_new</code> (creator only).
                  </p>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Recipient
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-mono text-sm"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    disabled={isBusy}
                  />
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Amount
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm"
                    value={amount1155}
                    onChange={(e) => setAmount1155(e.target.value)}
                    inputMode="numeric"
                    disabled={isBusy}
                  />
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Metadata URI
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm"
                    value={metadataCid}
                    onChange={(e) => setMetadataCid(e.target.value)}
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={runMintNormal1155}
                    className="w-full rounded-2xl bg-brand-500 py-4 text-white font-bold hover:bg-brand-600 disabled:opacity-50"
                  >
                    {isBusy ? "Sign in Freighter…" : "Mint"}
                  </button>
                </div>
              )}

              {record && isLazy && record.kind === "LazyMint721" && (
                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-4">
                  <h2 className="text-xl font-display font-bold text-gray-900">
                    Redeem voucher (Lazy 721)
                  </h2>
                  <p className="text-sm text-gray-600 font-inter">
                    Paste the JSON your creator provided and the 64-byte ed25519
                    signature in hex. You pay gas (and the voucher price) as the
                    connected wallet.
                  </p>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Voucher JSON
                  </label>
                  <textarea
                    className="w-full min-h-[180px] rounded-2xl border border-gray-200 p-4 font-mono text-xs"
                    value={voucherJson}
                    onChange={(e) => setVoucherJson(e.target.value)}
                    disabled={isBusy}
                    placeholder='{ "token_id": "1", "price": "0", "currency": "C...", "uri": "ipfs://...", "uri_hash": "...", "valid_until": "0" }'
                  />
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Signature (128 hex)
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-mono text-xs"
                    value={signatureHex}
                    onChange={(e) => setSignatureHex(e.target.value)}
                    disabled={isBusy}
                    placeholder="128 hex chars"
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={runRedeem721}
                    className="w-full rounded-2xl bg-brand-500 py-4 text-white font-bold hover:bg-brand-600 disabled:opacity-50"
                  >
                    {isBusy ? "Sign in Freighter…" : "Redeem & mint"}
                  </button>
                </div>
              )}

              {record && isLazy && record.kind === "LazyMint1155" && (
                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-4">
                  <h2 className="text-xl font-display font-bold text-gray-900">
                    Redeem voucher (Lazy 1155)
                  </h2>
                  <p className="text-sm text-gray-600 font-inter">
                    Voucher must include <code>buyer_quota</code> and{" "}
                    <code>price_per_unit</code>. Edition caps must be registered
                    on-chain by the creator before redemption.
                  </p>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Voucher JSON
                  </label>
                  <textarea
                    className="w-full min-h-[200px] rounded-2xl border border-gray-200 p-4 font-mono text-xs"
                    value={voucherJson}
                    onChange={(e) => setVoucherJson(e.target.value)}
                    disabled={isBusy}
                  />
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Units to mint
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm"
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                    inputMode="numeric"
                    disabled={isBusy}
                  />
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Signature (128 hex)
                  </label>
                  <input
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-mono text-xs"
                    value={signatureHex}
                    onChange={(e) => setSignatureHex(e.target.value)}
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={runRedeem1155}
                    className="w-full rounded-2xl bg-brand-500 py-4 text-white font-bold hover:bg-brand-600 disabled:opacity-50"
                  >
                    {isBusy ? "Sign in Freighter…" : "Redeem"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
