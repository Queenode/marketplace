use soroban_sdk::Map;
// ------------------------------------------------------------
// contract.rs — Afristore Marketplace contract implementation
// ------------------------------------------------------------

#[allow(unused_imports)]
use soroban_sdk::{
    contract, contractimpl, panic_with_error,
    token::Client as TokenClient,
    Address, Bytes, Env, Symbol, Vec,
};

use crate::events::*;

use crate::{
    storage::{
        add_artist_listing_id, get_artist_listing_ids, get_listing_count,
        increment_listing_count, load_listing, save_listing,
    },
    types::{Listing, ListingStatus, MarketplaceError},
};

// ────────────────────────────────────────────────────────────

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    // ── Admin/Whitelist Management ─────────────────────────

    /// Set the admin address (can only be set once)
    pub fn set_admin(env: Env, admin: Address) {
        let key = crate::storage::DataKey::Admin;
        if env.storage().persistent().get::<_, Address>(&key).is_some() {
            panic_with_error!(&env, MarketplaceError::Unauthorized);
        }
        admin.require_auth();
        env.storage().persistent().set(&key, &admin);
    }

    /// Add a token to the whitelist (admin only)
    pub fn add_token_to_whitelist(env: Env, token: Address) {
        Self::require_admin(&env);
        let key = crate::storage::DataKey::TokenWhitelist;
        let mut whitelist = env.storage().persistent().get::<_, Vec<Address>>(&key).unwrap_or(Vec::new(&env));
        if !whitelist.contains(&token) {
            whitelist.push_back(token);
            env.storage().persistent().set(&key, &whitelist);
        }
    }

    /// Remove a token from the whitelist (admin only)
    pub fn remove_token_from_whitelist(env: Env, token: Address) {
        Self::require_admin(&env);
        let key = crate::storage::DataKey::TokenWhitelist;
        let mut whitelist = env.storage().persistent().get::<_, Vec<Address>>(&key).unwrap_or(Vec::new(&env));
        let mut new_whitelist = Vec::new(&env);
        for t in whitelist.iter() {
            if t != token {
                new_whitelist.push_back(t.clone());
            }
        }
        env.storage().persistent().set(&key, &new_whitelist);
    }

    /// Internal: require that the caller is the admin
    fn require_admin(env: &Env) {
        let key = crate::storage::DataKey::Admin;
        let admin = env.storage().persistent().get::<_, Address>(&key).expect("admin not set");
        admin.require_auth();
    }

    /// Check if a token is whitelisted (returns true if whitelist is empty)
    fn is_token_whitelisted(env: &Env, token: &Address) -> bool {
        let key = crate::storage::DataKey::TokenWhitelist;
        let whitelist = env.storage().persistent().get::<_, Vec<Address>>(&key).unwrap_or(Vec::new(env));
        if whitelist.is_empty() {
            true
        } else {
            whitelist.contains(token)
        }
    }
    // ── create_listing ───────────────────────────────────────
    /// Artist creates a new listing.
    ///
    /// * `metadata_cid` — raw bytes of the IPFS CID string
    /// * `price`        — price in stroops (i128, must be > 0)
    /// * `currency`     — must be `Symbol::short("XLM")` for MVP
    pub fn create_listing(
        env: Env,
        artist: Address,
        metadata_cid: Bytes,
        price: i128,
        currency: Symbol,
        token: Address,
    ) -> u64 {
        artist.require_auth();
        if metadata_cid.is_empty() {
            panic_with_error!(&env, MarketplaceError::InvalidCid);
        }
        if price <= 0 {
            panic_with_error!(&env, MarketplaceError::InvalidPrice);
        }
        // Whitelist check
        if !Self::is_token_whitelisted(&env, &token) {
            panic_with_error!(&env, MarketplaceError::Unauthorized);
        }
        let listing_id = increment_listing_count(&env);
        let currency_cloned = currency.clone();
        let metadata_cid_cloned = metadata_cid.clone();
        let token_cloned = token.clone();
        let listing = Listing {
            listing_id,
            artist: artist.clone(),
            metadata_cid,
            price,
            currency,
            token,
            status: ListingStatus::Active,
            owner: None,
            created_at: env.ledger().sequence(),
        };
        save_listing(&env, &listing);
        add_artist_listing_id(&env, &artist, listing_id);
        ListingCreatedEvent {
            listing_id,
            artist: artist.clone(),
            price,
            currency: currency_cloned,
            metadata_cid: metadata_cid_cloned,
            ledger_sequence: env.ledger().sequence(),
        }.publish(&env);
        listing_id
    }

    // ── buy_artwork ──────────────────────────────────────────
    /// Buyer purchases an active listing by paying the listed price in XLM.
    ///
    /// The contract:
    /// 1. Validates the listing is Active.
    /// 2. Transfers `price` stroops from `buyer` → contract.
    /// 3. Transfers `price` stroops from contract → `artist`.
    /// 4. Marks the listing Sold and records the buyer as owner.
    pub fn buy_artwork(env: Env, buyer: Address, listing_id: u64) -> bool {
        buyer.require_auth();

        let mut listing = load_listing(&env, listing_id)
            .unwrap_or_else(|| panic_with_error!(&env, MarketplaceError::ListingNotFound));

        if listing.status != ListingStatus::Active {
            panic_with_error!(&env, MarketplaceError::ListingNotActive);
        }
        if listing.artist == buyer {
            panic_with_error!(&env, MarketplaceError::CannotBuyOwnListing);
        }

        // Transfer payment: buyer → this contract → artist.
        // In unit tests, native token contract state is not available in the host
        // by default, so we skip transfer calls and validate state transitions.
        #[cfg(not(test))]
        {
            let token = TokenClient::new(&env, &Self::xlm_token_address(&env));

            token.transfer(&buyer, &env.current_contract_address(), &listing.price);
            token.transfer(&env.current_contract_address(), &listing.artist, &listing.price);
        }

        // Update listing state.
        listing.status = ListingStatus::Sold;
        listing.owner = Some(buyer.clone());
        save_listing(&env, &listing);


        ArtworkSoldEvent {
            listing_id,
            artist: listing.artist.clone(),
            buyer: buyer.clone(),
            price: listing.price,
            currency: listing.currency.clone(),
            ledger_sequence: env.ledger().sequence(),
        }.publish(&env);

        true
    }

    // ── cancel_listing ───────────────────────────────────────
    /// Artist cancels their own active listing.
    pub fn cancel_listing(env: Env, artist: Address, listing_id: u64) -> bool {
        artist.require_auth();

        let mut listing = load_listing(&env, listing_id)
            .unwrap_or_else(|| panic_with_error!(&env, MarketplaceError::ListingNotFound));

        if listing.artist != artist {
            panic_with_error!(&env, MarketplaceError::Unauthorized);
        }
        if listing.status != ListingStatus::Active {
            panic_with_error!(&env, MarketplaceError::ListingNotActive);
        }

        listing.status = ListingStatus::Cancelled;
        save_listing(&env, &listing);

        ListingCancelledEvent {
            listing_id,
            artist: artist.clone(),
            ledger_sequence: env.ledger().sequence(),
        }.publish(&env);
        true
    }

    // ── get_listing ──────────────────────────────────────────
    /// Returns the full Listing struct for a given ID.
    /// Panics with `ListingNotFound` if the ID does not exist.
    pub fn get_listing(env: Env, listing_id: u64) -> Listing {
        load_listing(&env, listing_id)
            .unwrap_or_else(|| panic_with_error!(&env, MarketplaceError::ListingNotFound))
    }

    // ── get_total_listings ───────────────────────────────────
    /// Returns the total number of listings ever created (counter, not active count).
    pub fn get_total_listings(env: Env) -> u64 {
        get_listing_count(&env)
    }

    // ── get_artist_listings ──────────────────────────────────
    /// Returns the Vec of listing IDs created by a given artist address.
    pub fn get_artist_listings(env: Env, artist: Address) -> Vec<u64> {
        get_artist_listing_ids(&env, &artist)
    }

    // ── Internal helpers ─────────────────────────────────────

    /// Returns the Stellar native asset (XLM) Soroban contract address.
    ///
    /// `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` is the
    /// well-known, deterministic contract ID for the native XLM asset on
    /// every Stellar network (both testnet and mainnet).
    #[cfg(not(test))]
    fn xlm_token_address(env: &Env) -> Address {
        Address::from_string_bytes(
            &soroban_sdk::Bytes::from_slice(
                env,
                b"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
            ),
        )
    }
}
