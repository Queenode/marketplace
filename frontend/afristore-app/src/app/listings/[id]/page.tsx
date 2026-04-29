import { Metadata } from 'next'
import ListingClient from './ListingClient'
import { getListing, getAuction, stroopsToXlm } from '@/lib/contract'
import { fetchMetadata, cidToGatewayUrl } from '@/lib/ipfs'
import { config } from '@/lib/config'

interface ListingPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params
  const baseUrl = config.baseUrl
  const listingId = parseInt(id)
  
  if (isNaN(listingId)) {
    return {
      title: 'Artwork Not Found | Afristore',
      description: 'The artwork you are looking for does not exist or has been removed.',
    }
  }

  try {
    // Try to fetch listing first
    let listing = null
    let auction = null
    let metadata = null

    try {
      listing = await getListing(listingId)
    } catch (e) {
      // Try auction if listing fails
      try {
        auction = await getAuction(listingId)
      } catch (e) {
        // Neither found
      }
    }

    if (!listing && !auction) {
      return {
        title: 'Artwork Not Found | Afristore',
        description: 'The artwork you are looking for does not exist or has been removed.',
      }
    }

    // Fetch metadata
    const cid = listing?.metadata_cid || auction?.metadata_cid
    if (cid) {
      metadata = await fetchMetadata(cid)
    }

    const artist = listing?.artist || auction?.creator
    const price = listing ? stroopsToXlm(listing.price) : auction ? stroopsToXlm(auction.highest_bid || auction.reserve_price) : '0'
    const status = listing?.status || auction?.status

    const title = metadata?.title || `Artwork #${id}`
    const description = metadata?.description || `Discover this unique African digital artwork on the Stellar blockchain. ${listing ? 'Fixed price' : 'Auction'} listing.`
    const imageUrl = metadata?.image ? cidToGatewayUrl(metadata.image) : `${baseUrl}/api/og/listing/${id}`

    return {
      title: `${title} | ${artist?.slice(0, 6)}…${artist?.slice(-4)} | Afristore`,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        url: `${baseUrl}/listings/${id}`,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${title} by ${artist?.slice(0, 6)}…${artist?.slice(-4)}`,
          },
        ],
        siteName: 'Afristore - African Art Marketplace',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
        creator: '@afristore',
        site: '@afristore',
      },
      alternates: {
        canonical: `${baseUrl}/listings/${id}`,
      },
      keywords: [
        'African art',
        'NFT',
        'Stellar blockchain',
        'Digital art',
        metadata?.category || 'Art',
        metadata?.artist || 'African artist',
        title,
        'Crypto art',
        'Blockchain art',
        listing ? 'Buy art' : 'Bid on art',
      ],
      authors: metadata?.artist ? [{ name: metadata.artist }] : undefined,
      category: 'art',
    }
  } catch (error) {
    console.error('Failed to generate metadata for listing:', error)
    
    return {
      title: `Artwork #${id} | Afristore`,
      description: 'Discover this unique African digital artwork on the Stellar blockchain.',
    }
  }
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params
  return <ListingClient id={id} />
}
