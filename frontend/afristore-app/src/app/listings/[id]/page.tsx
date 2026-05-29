// ─────────────────────────────────────────────────────────────
// app/listings/[id]/page.tsx — Server component wrapper with OpenGraph metadata
// ─────────────────────────────────────────────────────────────

import { Metadata } from "next";
import ListingClient from "./ListingClient";
import { getListing, getAuction, stroopsToXlm } from "@/lib/contract";
import { fetchMetadata, cidToGatewayUrl } from "@/lib/ipfs";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = params;

  try {
    // Try to fetch listing or auction data
    let listing = null;
    let auction = null;
    let metadata = null;

    try {
      listing = await getListing(Number(id));
    } catch (e) {
      // Might be an auction
    }

    try {
      auction = await getAuction(Number(id));
    } catch (e) {
      // Might be a listing
    }

    const cid = listing?.metadata_cid || auction?.metadata_cid;
    if (cid) {
      metadata = await fetchMetadata(cid);
    }

    // Fallback for mock data (IDs 1-6)
    if (!metadata && Number(id) >= 1 && Number(id) <= 6) {
      const mockIdx = Number(id) - 1;
      const mocks = [
        {
          title: "Ndebele Geometry",
          artist: "GB2...Traditional",
          price: 250,
          image:
            "https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80",
        },
        {
          title: "Maasai Beadwork Essence",
          artist: "GB3...Contemporary",
          price: 180,
          image:
            "https://images.unsplash.com/photo-1590845947698-8924d7409b56?w=800&q=80",
        },
        {
          title: "Bronze Kingdom Legacy",
          artist: "GB4...Classical",
          price: 420,
          image:
            "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800&q=80",
        },
        {
          title: "Sahel Sunset Canvas",
          artist: "GB5...Modern",
          price: 310,
          image:
            "https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=800&q=80",
        },
        {
          title: "Kente Woven Dreams",
          artist: "GB6...Textile",
          price: 195,
          image:
            "https://images.unsplash.com/photo-1528699144885-3652875b4783?w=800&q=80",
        },
        {
          title: "Baobab Spirit",
          artist: "GB7...Sculpture",
          price: 375,
          image:
            "https://images.unsplash.com/photo-1559519529-0935f852b3a6?w=800&q=80",
        },
      ];
      const m = mocks[mockIdx];
      metadata = {
        title: m.title,
        description: `A stunning masterpiece representing the rich ${m.title.split(" ")[0]} culture.`,
        artist: m.artist,
        image: m.image,
      };
      listing = {
        price: BigInt(m.price) * BigInt(10_000_000),
        artist: m.artist,
      };
    }

    if (!metadata) {
      return {
        title: "Artwork Not Found - Afristore",
        description:
          "This artwork could not be found on Afristore marketplace.",
      };
    }

    const title = metadata.title || `Artwork #${id}`;
    const description =
      metadata.description || "Unique African art on Stellar blockchain";
    const artist = listing?.artist || auction?.creator || "Unknown Artist";
    const price =
      listing?.price || auction?.highest_bid || auction?.reserve_price;
    const priceDisplay = price
      ? `${stroopsToXlm(price)} XLM`
      : "Price on request";

    // Convert IPFS URLs to HTTP gateway URLs for OpenGraph
    const imageUrl = metadata.image ? cidToGatewayUrl(metadata.image) : null;

    return {
      title: `${title} - Afristore`,
      description: `${description} | By ${artist.slice(0, 8)}... | ${priceDisplay}`,
      openGraph: {
        title,
        description: `${description}\n\nArtist: ${artist.slice(0, 12)}...\nPrice: ${priceDisplay}`,
        type: "website",
        url: `https://afristore.art/listings/${id}`,
        images: imageUrl
          ? [
              {
                url: imageUrl,
                width: 1200,
                height: 1200,
                alt: title,
              },
            ]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: `${description} | ${priceDisplay}`,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Afristore - African Art Marketplace",
      description: "Discover unique African art on the Stellar blockchain",
    };
  }
}

export default function ListingPage({ params }: PageProps) {
  return <ListingClient id={params.id} />;
}
