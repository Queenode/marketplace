# Afristore

> Decentralized marketplace for African art, built on Stellar + Soroban smart contracts.

## Architecture

```
Freighter Wallet ──► Next.js Frontend ──► Soroban Contract (Stellar)
                          │                       │
                          ▼                       ▼
                     Pinata IPFS             On-chain Storage
                  (Images + Metadata)     (Listings + Ownership)
```

## Monorepo Structure

```
afristore/
├── contracts/
│   └── soroban-marketplace/          # Rust Soroban smart contract
│       ├── src/
│       │   ├── lib.rs                # Contract entry point
│       │   ├── types.rs              # Listing, Status, Error types
│       │   ├── storage.rs            # Storage key helpers
│       │   └── contract.rs           # Contract implementation
│       ├── Cargo.toml
│       └── Makefile
├── frontend/
│   └── afristore-app/                # Next.js 14 App Router frontend
│       ├── src/
│       │   ├── app/                  # App Router pages
│       │   ├── components/           # Reusable UI components
│       │   ├── lib/                  # Stellar SDK, IPFS, contract helpers
│       │   └── hooks/                # React hooks
│       ├── public/
│       ├── package.json
│       └── next.config.js
└── scripts/
    └── deploy/                       # Deployment scripts
        ├── deploy_contract.sh
        └── fund_account.sh
```

## Quick Start

### 1. Deploy the Soroban contract (Testnet)

```bash
cd scripts/deploy
./fund_account.sh          # fund a new keypair on testnet
./deploy_contract.sh       # build + deploy the contract
```

### 2. Start the frontend

```bash
cd frontend/afristore-app
cp .env.example .env.local   # fill in contract ID + Pinata keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed Soroban contract address |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Soroban RPC endpoint |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | Horizon API endpoint |
| `NEXT_PUBLIC_PINATA_JWT` | Pinata JWT for IPFS uploads |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Pinata IPFS gateway URL |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Blockchain | Stellar / Soroban |
| Smart Contracts | Rust (soroban-sdk) |
| Wallet | Freighter |
| Storage | IPFS via Pinata |
| Blockchain SDK | @stellar/stellar-sdk |

## Future Improvements

- PostgreSQL event indexer for fast queries + search
- On-chain royalties (EIP-2981 equivalent for Soroban)
- Secondary resale market with royalty split
- Search + category filtering via indexed metadata
- Auction / bidding contract
- Analytics dashboard
- Mobile wallet support (LOBSTR, xBull)


## Future Plan (V2)

### 1) Split into dedicated repositories

To scale development and deployment, this monorepo will be split into focused repos:

- `afristore-frontend`
    - Next.js app, wallet UX, listing/discovery pages, creator dashboard
- `afristore-backend`
    - Indexer, API, search, analytics, notifications, admin services
- `afristore-contracts`
    - Soroban marketplace, auction, royalty, and protocol-level smart contracts

### 2) Marketplace evolution

- Move from “create NFT in marketplace” to “list existing NFT for sale”
- Enable clean primary and secondary sales flow
- Preserve `original_creator` + royalty rules across all resales
- Keep protocol fee and payout splitting fully on-chain

### 3) Launchpad creation

The launchpad will support creator-first primary drops:

- Collection/project setup for artists and brands
- Configurable drop mechanics (fixed price, timed drop, allowlist)
- Primary mint + instant listing pipeline
- Launch metrics dashboard (mints, volume, conversion)
- Shared royalty and treasury configuration with marketplace

### 4) Supporting improvements

- PostgreSQL event indexer for fast queries and search
- Auction / bidding contracts and offer workflows

## Deploy Workflow

### 1 — Deploy Launchpad factory and collection WASMs
```bash
cd scripts/deploy
./fund_account.sh                  # create + fund a testnet keypair
./deploy_contract.sh               # deploy marketplace contract

# Upload collection WASMs and deploy launchpad (see contracts/launchpad/README.md)
HASH_N721=$(stellar contract upload --wasm target/.../normal_721.wasm --network testnet --source deployer)
HASH_N1155=$(stellar contract upload --wasm target/.../normal_1155.wasm --network testnet --source deployer)
HASH_L721=$(stellar contract upload  --wasm target/.../lazy_721.wasm   --network testnet --source deployer)
HASH_L1155=$(stellar contract upload --wasm target/.../lazy_1155.wasm  --network testnet --source deployer)

LAUNCHPAD=$(stellar contract deploy --wasm target/.../launchpad.wasm --network testnet --source deployer)

stellar contract invoke --id $LAUNCHPAD --network testnet --source deployer \
  --fn initialize -- --admin $ADMIN_ADDRESS \
  --platform_fee_receiver $ADMIN_ADDRESS --platform_fee_bps 0

stellar contract invoke --id $LAUNCHPAD --network testnet --source deployer \
  --fn set_wasm_hashes -- \
  --wasm_normal_721 $HASH_N721 --wasm_normal_1155 $HASH_N1155 \
  --wasm_lazy_721 $HASH_L721   --wasm_lazy_1155 $HASH_L1155
```

### 2 — Create a collection (user flow)
```bash
stellar contract invoke --id $LAUNCHPAD --network testnet --source creator \
  --fn deploy_normal_721 -- \
  --creator $CREATOR_ADDRESS --name "My Collection" --symbol "MYC" \
  --max_supply 10000 --royalty_bps 500 --royalty_receiver $CREATOR_ADDRESS \
  --salt $(openssl rand -hex 32)
# Returns: collection contract address — indexed automatically by the indexer
```

### 3 — Marketplace deployment
```bash
# Start the indexer (picks up deploy + marketplace events)
cd indexer
cp .env.example .env
# Set MARKETPLACE_CONTRACT_ID, LAUNCHPAD_CONTRACT_ID, DATABASE_URL
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

Access the dashboard at `http://localhost:3000/admin` — wallet must match the admin address set during launchpad initialisation.
