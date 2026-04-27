# afristore-app

Next.js 14 frontend for the Afristore decentralized African art marketplace.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Blockchain | `@stellar/stellar-sdk` |
| Wallet | `@stellar/freighter-api` |
| IPFS | Pinata REST API (`axios`) |
| Icons | `lucide-react` |

## Design Guidelines

For open-source contributors or UI designers, please adhere to the following design system when implementing new features or components:

**Color Palette:**
- Primary Brand Color: `#E27D60` (Vibrant Terracotta)
- Secondary Brand Color: `#85DCBA` (Soft Mint Green)
- Background Color (Light): `#F8F9FA` (Off-white)
- Background Color (Dark): `#1E1E24` (Deep Charcoal)
- Text Primary (Light Mode): `#212529` (Nearly Black)
- Text Secondary (Light Mode): `#6C757D` (Muted Gray)
- Accent Error: `#E63946` (Vivid Red)
- Accent Success: `#2A9D8F` (Teal)

**Typography (Google Fonts):**
- Headings (H1-H6): `Playfair Display` (Bold, semi-bold - reflects an artistic, gallery-like feel)
- Body Text: `Inter` (Regular, Medium - ensures readability for long descriptions and numbers)
- Monospace (Wallet Addresses, code): `Fira Code` or `JetBrains Mono`

**Visual Guide**
[link to docs here](https://docs.google.com/document/d/1ABou8688S3lLqG9ZXAW9i5z8h9p2QVZdtIeEpRB4Y-M/edit?usp=sharing)


*Note: The frontend avoids Figma for the time being. Follow these styles by utilizing Tailwind utility classes properly mapped in `tailwind.config.ts`.*

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout — WalletProvider + Navbar
│   ├── page.tsx                # Marketplace browse page
│   ├── dashboard/page.tsx      # Artist dashboard (list + manage)
│   └── listing/[id]/page.tsx   # Individual listing detail + buy
│
├── components/
│   ├── Navbar.tsx              # Sticky nav with wallet connect button
│   ├── ListingCard.tsx         # Artwork card with buy flow
│   └── UploadArtworkForm.tsx   # Drag-drop upload + IPFS + on-chain listing
│
├── context/
│   └── WalletContext.tsx       # Global Freighter wallet state
│
├── hooks/
│   ├── useWallet.ts            # Freighter connect / disconnect / auto-reconnect
│   └── useMarketplace.ts       # useMarketplace, useArtistListings,
│                               # useCreateListing, useBuyArtwork, useCancelListing
│
└── lib/
    ├── config.ts               # Centralised env var access
    ├── contract.ts             # Soroban contract client (all 6 functions)
    ├── freighter.ts            # Freighter sign + connect helpers
    └── ipfs.ts                 # Pinata upload (image + JSON) + fetch helpers
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed Soroban contract address |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Soroban RPC endpoint |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | Horizon REST API |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | Stellar network passphrase |
| `PINATA_JWT` | Pinata API JWT (server-side only; never expose publicly) |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Pinata IPFS gateway URL |
| `NEXT_PUBLIC_INDEXER_URL` | Base URL of the Afristore indexer API (e.g. `http://localhost:4000` in dev) |

## Install & Run

Use **Node.js 20.x** (same as CI) for reliable parity with the ESLint 8 + `eslint-config-next` toolchain. Node **18+** is the minimum supported for this app.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (CLI; `next lint` is not used) |
| `npm run type-check` | TypeScript check (no emit) |

## Wallet Setup

1. Install [Freighter](https://www.freighter.app) browser extension
2. Create or import a Stellar wallet
3. Switch to **Testnet** in Freighter settings
4. Fund your test account: [https://friendbot.stellar.org](https://friendbot.stellar.org)

## IPFS Setup

1. Sign up at [app.pinata.cloud](https://app.pinata.cloud)
2. Go to **API Keys → New Key**, select **Admin** scope
3. Copy the JWT into `.env.local` as `PINATA_JWT`

The app uploads to Pinata through internal API routes (`/api/ipfs/upload-image`, `/api/ipfs/upload-metadata`) so the JWT stays server-side.

## Artist Flow

1. Connect Freighter wallet
2. Navigate to **My Dashboard → New Listing**
3. Drag-drop your artwork image
4. Fill in title, description, artist name, year, price
5. Click **List Artwork** — the app will:
   - Upload the image to IPFS via Pinata
   - Build and upload metadata JSON to IPFS
   - Call `create_listing` on the Soroban contract (Freighter popup)

## Buyer Flow

1. Browse the marketplace at `/`
2. Click an artwork card or **Buy Now**
3. Freighter prompts for transaction signing
4. Contract transfers XLM from buyer → artist and records ownership

## IPFS Metadata Schema

```json
{
  "title": "Sunlit Savanna",
  "description": "Oil on canvas, inspired by the Serengeti at dawn.",
  "artist": "Amara Diallo",
  "image": "ipfs://QmImageCIDHere",
  "year": "2025"
}
```

## Deployment

```bash
npm run build
npm run start
```

Or deploy to [Vercel](https://vercel.com) — connect the repo and set required
environment variables in project settings (`NEXT_PUBLIC_*` for public config,
`PINATA_JWT` as a private server variable).
