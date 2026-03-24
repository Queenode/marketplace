// ─────────────────────────────────────────────────────────────
// app/listing/[id]/page.tsx — Individual listing detail page
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { getListing, stroopsToXlm, Listing } from "@/lib/contract";
import { fetchMetadata, cidToGatewayUrl, ArtworkMetadata } from "@/lib/ipfs";
import { useWalletContext } from "@/context/WalletContext";
import { useBuyArtwork } from "@/hooks/useMarketplace";
import { GuardButton } from "@/components/WalletGuard";
import {
  ArrowLeft,
  ExternalLink,
  ShoppingCart,
  User,
  Calendar,
  Tag,
  Hash,
  Loader2,
} from "lucide-react";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { publicKey } = useWalletContext();
  const { buy, isBuying, error: buyError } = useBuyArtwork(publicKey);

  const [listing, setListing] = useState<Listing | null>(null);
  const [metadata, setMetadata] = useState<ArtworkMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const l = await getListing(Number(id));
        setListing(l);
        const m = await fetchMetadata(l.metadata_cid);
        setMetadata(m);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load listing");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handleBuy = async () => {
    if (!listing) return;
    const success = await buy(listing.listing_id);
    if (success) {
      setPurchased(true);
      // Reload listing to show Sold status.
      const updated = await getListing(listing.listing_id);
      setListing(updated);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">{error ?? "Listing not found"}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-brand-500 hover:underline">
          ← Back
        </button>
      </div>
    );
  }

  const imageUrl = metadata?.image ? cidToGatewayUrl(metadata.image) : null;
  const isOwn = publicKey === listing.artist;
  const canBuy = listing.status === "Active" && !isOwn;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} />
        Back to marketplace
      </button>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-brand-50">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={metadata?.title ?? "Artwork"}
              fill
              className="object-contain"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-7xl">🖼️</div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <h1 className="text-3xl font-display font-bold text-gray-900">
            {metadata?.title ?? `Listing #${listing.listing_id}`}
          </h1>

          {metadata?.description && (
            <p className="mt-3 text-gray-600 leading-relaxed">
              {metadata.description}
            </p>
          )}

          <div className="mt-6 space-y-3 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User size={15} />
              <span className="font-mono break-all">{listing.artist}</span>
            </div>
            {metadata?.year && (
              <div className="flex items-center gap-2">
                <Calendar size={15} />
                <span>{metadata.year}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Hash size={15} />
              <a
                href={`https://ipfs.io/ipfs/${listing.metadata_cid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-brand-500 hover:underline"
              >
                {listing.metadata_cid.slice(0, 20)}…
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <div className="flex items-center gap-2 text-brand-600">
              <Tag size={16} />
              <span className="text-3xl font-bold">
                {stroopsToXlm(listing.price)} XLM
              </span>
            </div>

            <div className="mt-1 text-xs text-gray-400">
              ≈ {(Number(listing.price) / 10_000_000).toFixed(4)} XLM
              {listing.status === "Sold" && (
                <span className="ml-3 rounded-full bg-gray-200 px-2 py-0.5 font-semibold text-gray-600">
                  SOLD
                </span>
              )}
            </div>

            {purchased && (
              <div className="mt-3 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700">
                ✓ Purchase successful! This artwork is now yours.
              </div>
            )}

            {buyError && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">
                {buyError}
              </div>
            )}

            {canBuy && !purchased && (
              <GuardButton
                onAction={handleBuy}
                disabled={isBuying}
                actionName="To purchase this artwork"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 font-bold text-white shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <ShoppingCart size={20} />
                {isBuying ? "Processing Purchase…" : "Buy Now"}
              </GuardButton>
            )}

            {isOwn && (
              <p className="mt-4 text-center text-sm text-gray-400">
                This is your listing.
              </p>
            )}
          </div>

          {/* On-chain info */}
          <div className="mt-6 text-xs text-gray-400 space-y-1">
            <p>Listing ID: <span className="font-mono">#{listing.listing_id}</span></p>
            <p>Created at ledger: <span className="font-mono">{listing.created_at}</span></p>
            {listing.owner && (
              <p>
                Owner: <span className="font-mono break-all">{listing.owner}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
