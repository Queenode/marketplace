# Afristore

> Decentralized marketplace for African art, built on Stellar + Soroban smart contracts.

## Architecture

```
Freighter/Magic Wallet ──► Next.js Frontend ──► Soroban Contracts (Stellar)
                              │       │
                              │       ▼
                              │  Pinata IPFS
                              │  (Images + Metadata)
                              │
                              ▼
                         Indexer (Node.js)
                              │
                              ▼
                         PostgreSQL (events, listings, offers, auctions)
                              │
                              ▼
                         Redis Cache + Prometheus Metrics
```

## Monorepo Structure

```
afristore/
├── contracts/
│   ├── soroban-marketplace/      # Main marketplace contract (Rust/Soroban)
│   │   ├── src/
│   │   │   ├── lib.rs            # Contract entry point
│   │   │   ├── types.rs          # Listing, Auction, Offer, Status, Error types
│   │   │   ├── storage.rs        # Persistent/temporary storage key helpers
│   │   │   ├── contract.rs       # Core marketplace logic
│   │   │   ├── events.rs         # Event structs and publish helpers
│   │   │   └── test.rs           # Comprehensive tests
│   │   └── docs/
│   │       ├── PAUSE_MECHANISM.md
│   │       └── event_schema.md
│   ├── launchpad/                # Collection factory contract
│   ├── collection_nft_erc721/    # Standard ERC-721 NFT contract
│   ├── collection_nft_erc1155/   # Standard ERC-1155 NFT contract
│   ├── lazy_mint_erc721/         # Gas-efficient lazy-mint ERC-721
│   ├── lazy_mint_erc1155/        # Gas-efficient lazy-mint ERC-1155
│   └── CONTRIBUTING.md
├── frontend/
│   └── afristore-app/            # Next.js 14 App Router frontend
│       ├── src/
│       │   ├── app/              # App Router pages (listings, auctions, offers, launchpad, profile, admin, settings)
│       │   ├── components/       # Reusable UI components
│       │   ├── lib/              # Stellar SDK, IPFS, contract helpers, indexer client
│       │   ├── hooks/            # React hooks (wallet, marketplace, auctions, offers, admin)
│       │   ├── context/          # WalletContext (unified Freighter + Magic)
│       │   ├── providers/        # PostHog analytics provider
│       │   └── config/           # Token config
│       ├── e2e/                  # Playwright E2E tests
│       ├── __tests__/            # Unit tests (28 test files)
│       └── docs/
│           └── MAGIC_WALLET_INTEGRATION.md
├── indexer/                      # PostgreSQL event indexer
│   ├── src/
│   │   ├── poller.ts             # Stellar RPC event poller + reorg detection
│   │   ├── parser.ts             # XDR event decoder
│   │   ├── db.ts                 # Prisma client
│   │   ├── redis.ts              # Lazy Redis cache client
│   │   ├── metrics.ts            # Prometheus metrics (sync latency, request duration)
│   │   ├── index.ts              # Express API server
│   │   ├── api/
│   │   │   ├── routes.ts         # REST endpoints (listings, auctions, offers, collections, wallets)
│   │   │   ├── cache-middleware.ts
│   │   │   └── rate-limit-middleware.ts
│   │   └── __tests__/            # 7 test files
│   ├── prisma/
│   │   └── schema.prisma         # DB models: SyncState, Listing, Auction, Offer, MarketplaceEvent, Collection
│   └── docker-compose.yml
├── scripts/
│   └── deploy/                   # Deployment scripts for Soroban contracts
└── .github/
    └── workflows/ci.yml          # CI pipeline (Rust/cargo + frontend + indexer tests)
```

## Quick Start

### 1. Deploy Soroban contracts (Testnet)

```bash
cd scripts/deploy
./fund_account.sh          # fund a new keypair on testnet
./deploy_contract.sh       # build + deploy marketplace contract
# See contracts/launchpad/README.md for collection factory deployment
```

### 2. Start the indexer

```bash
cd indexer
cp .env.example .env       # fill in DATABASE_URL, MARKETPLACE_CONTRACT_ID, etc.
npx prisma migrate deploy
npm install && npm start
```

### 3. Start the frontend

```bash
cd frontend/afristore-app
cp .env.example .env.local # fill in contract ID + Pinata keys + indexer URL
npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

### Marketplace
- Create, update, and cancel listings with IPFS metadata
- Buy artwork with XLM or whitelisted tokens
- Make, accept, reject, and withdraw offers
- Create auctions with reserve price, place bids, finalize expired auctions
- Royalty distribution (original creator receives royalty on resales)
- Protocol fee configured by admin
- Artist revocation/reinstatement

### Admin
- Set admin (1-step) and transfer admin (2-step propose/accept)
- Configure treasury address and protocol fee BPS
- Admin pause/unpause (circuit breaker) blocking all marketplace operations
- Add/remove tokens from payment whitelist
- Revoke/reinstate artists
- Dashboard with fee management, collection registry, listing oversight, event log, creator profiles

### Launchpad
- Deploy NFT collections (normal 721/1155, lazy-mint 721/1155)
- Salt-based front-running protection
- Platform fee configuration per-collection
- Collection creation wizard in frontend

### Indexer
- Real-time event polling from Stellar RPC with configurable interval
- Ledger hash continuity verification + automatic reorg rollback
- Prometheus metrics (sync latency, request duration, processed ledger gauge)
- Redis caching with configurable TTL
- Rate limiting via express-rate-limit
- REST API: listings, auctions, offers, collections, wallet activity, royalty stats
- Stores all events, listings, auctions, offers, and collections in PostgreSQL

## Indexer API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/listings` | List listings with filters (artist, status, minPrice, maxPrice, search) |
| GET | `/listings/:id` | Single listing with IPFS metadata |
| GET | `/listings/:id/history` | Event history for a listing |
| GET | `/auctions` | List auctions with filters |
| GET | `/auctions/:id` | Single auction details |
| GET | `/offers?listing_id=` | Offers for a listing |
| GET | `/collections` | All collections with optional kind/creator filters |
| GET | `/creators/:address/collections` | Collections by creator |
| GET | `/wallets/:address/activity` | Wallet transaction history |
| GET | `/wallets/:address/royalty-stats` | Royalty earnings for an artist |
| GET | `/health` | Health check (DB, Redis, poller status) |
| GET | `/metrics` | Prometheus metrics |

## Current Testnet Deployment (2026-04-09)

| Item | Address / ID | Notes |
|---|---|---|
| Deployer / Admin Wallet | `GBFUNHEQOVN35LFEKP7SZXFYJPMJ3WLXLX4PQZGBK737NTLRHOKVES3F` | Testnet account |
| Marketplace (active) | `CB74XQOHEVOL2NQ376JLVW5IGVM6I5VFDSHG66YKSHDQKRNTYGGXW25E` | Frontend default |
| Launchpad Factory | `CA4RKSR4ORRIFBBW64MXCWS7GGJ4GY6AIXRGU5EGS43XBDDB7OYV3TRG` | Initialised with WASM hashes |
| Normal 1155 Collection | `CAQBWUKVLOR5W43QBQDFJAHSE2LUGCALRDCM7EVEO36FTWOP5P2O36ML` | Deployed via launchpad |
| Normal ERC-721 | `f30ec91a14455d1df413aeeeb50b45006635f1d07c428451c9e48d8491defd4d` | Deployed via launchpad |
| Normal ERC-1155 | `4f75324c7833a76f78600fa1852872fc75a16889e99a386e1f33efd3b8f95c6c` | Deployed via launchpad |
| Lazy Mint ERC-721 | `ca1fc3ce988235f088c332c52550b49e4dc427ea2a48827440d334a042ddec2e` | Deployed via launchpad |
| Lazy Mint ERC-1155 | `f71b7c5c82243f4b5176c554615b08e2d228043b51cdb9023813a94ae2db9f4f` | Deployed via launchpad |

## Environment Variables

### Frontend (`frontend/afristore-app/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed Soroban marketplace contract address |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Soroban RPC endpoint |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | Horizon API endpoint |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | Network passphrase |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Pinata IPFS gateway URL |
| `NEXT_PUBLIC_INDEXER_URL` | Indexer API base URL |
| `PINATA_JWT` | Pinata JWT for server-side uploads (private) |

### Indexer (`indexer/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `MARKETPLACE_CONTRACT_ID` | Soroban marketplace contract ID |
| `LAUNCHPAD_CONTRACT_ID` | Launchpad factory contract ID |
| `REDIS_URL` | Redis connection string (optional) |
| `STELLAR_RPC_URL` | Stellar RPC endpoint |
| `PORT` | API server port |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) |
| `POLL_INTERVAL_MS` | Event poll interval in ms |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Blockchain | Stellar / Soroban |
| Smart Contracts | Rust (soroban-sdk) |
| Wallet | Freighter + Magic.link (email/passkey) |
| Storage | IPFS via Pinata |
| Indexer | Node.js, Express, Prisma, PostgreSQL |
| Cache | Redis |
| Monitoring | Prometheus, Sentry |
| Analytics | PostHog |
| Testing | Rust `#[test]`, Jest, Playwright, Vitest |
| CI/CD | GitHub Actions (cargo + frontend + indexer) |

## Future Plan

### 1) Split into dedicated repositories
- `afristore-frontend` — Next.js app, wallet UX, discovery, creator dashboard
- `afristore-backend` — Indexer, API, search, analytics, admin services
- `afristore-contracts` — Soroban marketplace, auction, royalty, protocol contracts

### 2) Marketplace evolution
- Enable clean primary and secondary sales flow
- Preserve `original_creator` + royalty rules across all resales
- Keep protocol fee and payout splitting fully on-chain

### 3) Launchpad growth
- Configurable drop mechanics (fixed price, timed drop, allowlist)
- Primary mint + instant listing pipeline
- Launch metrics dashboard (mints, volume, conversion)

## Deploy Workflow

### 1 — Deploy Launchpad factory and collection WASMs

```bash
cd scripts/deploy
./fund_account.sh
./deploy_contract.sh

# Upload WASMs and deploy launchpad
HASH_N721=$(stellar contract upload --wasm target/.../normal_721.wasm --network testnet --source deployer)
HASH_N1155=$(stellar contract upload --wasm target/.../normal_1155.wasm --network testnet --source deployer)
HASH_L721=$(stellar contract upload --wasm target/.../lazy_721.wasm --network testnet --source deployer)
HASH_L1155=$(stellar contract upload --wasm target/.../lazy_1155.wasm --network testnet --source deployer)

LAUNCHPAD=$(stellar contract deploy --wasm target/.../launchpad.wasm --network testnet --source deployer)

stellar contract invoke --id $LAUNCHPAD --network testnet --source deployer \
  --fn initialize -- --admin $ADMIN_ADDRESS \
  --platform_fee_receiver $ADMIN_ADDRESS --platform_fee_bps 0

stellar contract invoke --id $LAUNCHPAD --network testnet --source deployer \
  --fn set_wasm_hashes -- \
  --wasm_normal_721 $HASH_N721 --wasm_normal_1155 $HASH_N1155 \
  --wasm_lazy_721 $HASH_L721 --wasm_lazy_1155 $HASH_L1155
```

### 2 — Create a collection (user flow)

```bash
stellar contract invoke --id $LAUNCHPAD --network testnet --source creator \
  --fn deploy_normal_721 -- \
  --creator $CREATOR_ADDRESS --name "My Collection" --symbol "MYC" \
  --max_supply 10000 --royalty_bps 500 --royalty_receiver $CREATOR_ADDRESS \
  --salt $(openssl rand -hex 32)
```

### 3 — Marketplace deployment

```bash
cd indexer
cp .env.example .env
# Set MARKETPLACE_CONTRACT_ID, LAUNCHPAD_CONTRACT_ID, DATABASE_URL
npx prisma migrate deploy
npm install && npm run build && npm start
```

## Admin Dashboard

The admin dashboard (`/admin`) provides platform operators with:

| Feature | Description |
|---|---|
| Fee management | View and update platform fee BPS and receiver address |
| Collection registry | Browse all deployed collections with creator and kind |
| Listing oversight | View all active, sold, and cancelled listings |
| Event log | Full on-chain event timeline per listing |
| Creator profiles | Collections and activity per creator address |

Access at `http://localhost:3000/admin` — wallet must match the admin address set during launchpad initialization.
