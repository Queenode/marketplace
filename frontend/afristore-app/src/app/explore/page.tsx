// ─────────────────────────────────────────────────────────────
// app/explore/page.tsx — Browse / Explore All Listings
//
// Full catalogue page with search, filtering, sorting, and
// pagination for discovering marketplace listings at scale.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Listing, stroopsToXlm } from "@/lib/contract";
import { ListingCard } from "@/components/ListingCard";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { SearchFilter, Filters, StatusFilter, SortOption } from "@/components/SearchFilter";
import { fetchMetadata, ArtworkMetadata } from "@/lib/ipfs";

// ── Types ────────────────────────────────────────────────────

const PAGE_SIZE = 12;

// ── Metadata cache for search ────────────────────────────────

const metadataCache = new Map<string, ArtworkMetadata | null>();

async function getCachedMetadata(
  cid: string
): Promise<ArtworkMetadata | null> {
  if (metadataCache.has(cid)) return metadataCache.get(cid) ?? null;
  try {
    const meta = await fetchMetadata(cid);
    metadataCache.set(cid, meta);
    return meta;
  } catch {
    metadataCache.set(cid, null);
    return null;
  }
}

// ── Page Component ───────────────────────────────────────────

export default function ExplorePage() {
  const { listings, isLoading, error, refresh } = useMarketplace();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "All",
    category: "All",
    minPrice: "",
    maxPrice: "",
    sort: "newest",
  });

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Metadata map for search matching (resolved asynchronously)
  const [metadataMap, setMetadataMap] = useState<
    Map<string, ArtworkMetadata | null>
  >(new Map());

  // Resolve metadata for all listings so search can match on title/artist
  useEffect(() => {
    if (listings.length === 0) return;

    let cancelled = false;
    const resolveAll = async () => {
      const entries: [string, ArtworkMetadata | null][] = [];
      await Promise.all(
        listings.map(async (l) => {
          const meta = await getCachedMetadata(l.metadata_cid);
          entries.push([l.metadata_cid, meta]);
        })
      );
      if (!cancelled) {
        setMetadataMap(new Map(entries));
      }
    };
    resolveAll();
    return () => {
      cancelled = true;
    };
  }, [listings]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // ── Filtering + Sorting ──────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...listings];

    // Status filter
    if (filters.status !== "All") {
      result = result.filter((l) => l.status === filters.status);
    }

    // Category filter
    if (filters.category !== "All") {
      result = result.filter((l) => {
        const meta = metadataMap.get(l.metadata_cid);
        return meta?.category === filters.category;
      });
    }

    // Price range filter
    if (filters.minPrice !== "") {
      const min = parseFloat(filters.minPrice);
      result = result.filter((l) => parseFloat(stroopsToXlm(l.price)) >= min);
    }
    if (filters.maxPrice !== "") {
      const max = parseFloat(filters.maxPrice);
      result = result.filter((l) => parseFloat(stroopsToXlm(l.price)) <= max);
    }

    // Search (matches title, artist address, or metadata artist name)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter((l) => {
        if (l.artist.toLowerCase().includes(q)) return true;
        if (l.metadata_cid.toLowerCase().includes(q)) return true;
        const meta = metadataMap.get(l.metadata_cid);
        if (meta?.title?.toLowerCase().includes(q)) return true;
        if (meta?.artist?.toLowerCase().includes(q)) return true;
        if (meta?.description?.toLowerCase().includes(q)) return true;
        if (meta?.category?.toLowerCase().includes(q)) return true;
        return false;
      });
    }

    // Sort
    switch (filters.sort) {
      case "newest":
        result.sort((a, b) => b.created_at - a.created_at);
        break;
      case "oldest":
        result.sort((a, b) => a.created_at - b.created_at);
        break;
      case "price-low":
        result.sort((a, b) => Number(a.price - b.price));
        break;
      case "price-high":
        result.sort((a, b) => Number(b.price - a.price));
        break;
    }

    return result;
  }, [listings, filters, metadataMap]);

  // ── Pagination ───────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedListings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const goToPage = useCallback(
    (p: number) => {
      setPage(Math.max(1, Math.min(p, totalPages)));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [totalPages]
  );

  // ── Stats ────────────────────────────────────────────────

  const activeCnt = listings.filter((l) => l.status === "Active").length;
  const soldCnt = listings.filter((l) => l.status === "Sold").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-midnight-900 pt-32 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-display font-bold text-white tracking-tight">
                Explore Artworks
              </h1>
              <p className="max-w-xl text-xl text-white/60 font-inter leading-relaxed">
                Discover and collect unique African art on the blockchain
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 md:gap-12">
              {[
                { label: "Total Art", value: listings.length },
                { label: "Active", value: activeCnt },
                { label: "Sold", value: soldCnt },
              ].map(({ label, value }) => (
                <div key={label} className="relative">
                  <span className="text-3xl font-display font-bold text-white block">
                    {value}
                  </span>
                  <span className="text-sm font-bold uppercase tracking-widest text-brand-500">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <SearchFilter
        filters={filters}
        onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        totalResults={filtered.length}
      />

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {/* Results count */}
        {!isLoading && !error && (
          <p className="mb-6 text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}
              {" - "}
              {Math.min(page * PAGE_SIZE, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {filtered.length}
            </span>{" "}
            {filtered.length === 1 ? "artwork" : "artworks"}
            {filters.search && (
              <span>
                {" "}
                matching &ldquo;
                <span className="font-medium text-brand-600">{filters.search}</span>
                &rdquo;
              </span>
            )}
          </p>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="font-display font-bold text-gray-900 text-lg">
              Failed to load listings
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm text-center">
              {error}
            </p>
            <button
              onClick={refresh}
              className="mt-6 flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition-all"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !error && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-gray-100 bg-white overflow-hidden"
              >
                <div className="aspect-square bg-gray-100" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-gray-100" />
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                  <div className="h-8 w-full rounded-lg bg-gray-100 mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 mb-4">
              <Package size={32} />
            </div>
            <h3 className="font-display font-bold text-gray-900 text-lg">
              No artworks found
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm text-center">
              {filters.search
                ? "Try adjusting your search or filters to find what you are looking for."
                : "No listings match the current filters. Check back soon for new artworks."}
            </p>
            {(filters.search || filters.status !== "All" || filters.category !== "All") && (
              <button
                onClick={() => {
                  setFilters({
                    search: "",
                    status: "All",
                    category: "All",
                    minPrice: "",
                    maxPrice: "",
                    sort: "newest",
                  });
                }}
                className="mt-6 flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Listings grid */}
        {!isLoading && !error && filtered.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedListings.map((listing: Listing) => (
                <ListingCard
                  key={listing.listing_id}
                  listing={listing}
                  onPurchased={refresh}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, and pages near current
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - page) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push("...");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span
                        key={`dots-${idx}`}
                        className="px-1 text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item as number)}
                        className={`min-w-[36px] rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                          page === item
                            ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
