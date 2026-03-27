extern crate std;

use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, BytesN, Env, String};

use crate::{CollectionKind, Launchpad, LaunchpadClient};

fn jump_ledger(env: &Env, delta: u32) {
    env.ledger().with_mut(|li| {
        li.sequence_number += delta;
    });
}

fn wasm_bytes(name: &str) -> std::vec::Vec<u8> {
    // In Cursor's sandbox, cargo builds into an isolated target dir (not `./target`).
    // Derive the target dir from the current test binary path:
    //   .../cargo-target/debug/deps/<test-binary>
    let exe = std::env::current_exe().unwrap();
    let target_dir = exe
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .unwrap()
        .to_path_buf();
    let path = target_dir
        .join("wasm32-unknown-unknown")
        .join("release")
        .join(std::format!("{name}.wasm"));

    std::fs::read(&path).unwrap_or_else(|_| {
        panic!(
            "missing wasm at {}. build it first with: cargo build --target wasm32-unknown-unknown --release -p collection-nft-erc1155 -p lazy-mint-erc721 -p collection-nft-erc721 -p lazy-mint-erc1155",
            path.display()
        )
    })
}

fn setup_launchpad(env: &Env) -> (LaunchpadClient<'_>, Address, Address, Address) {
    env.mock_all_auths();

    let launchpad_id = env.register(Launchpad, ());
    let client = LaunchpadClient::new(env, &launchpad_id);

    let admin = Address::generate(env);
    let fee_receiver = Address::generate(env);
    let creator = Address::generate(env);

    client.initialize(&admin, &fee_receiver, &0u32);

    let wasm_normal_721_bytes = wasm_bytes("collection_nft_erc721");
    let wasm_normal_1155_bytes = wasm_bytes("collection_nft_erc1155");
    let wasm_lazy_721_bytes = wasm_bytes("lazy_mint_erc721");
    let wasm_lazy_1155_bytes = wasm_bytes("lazy_mint_erc1155");

    let wasm_normal_721 = env
        .deployer()
        .upload_contract_wasm(wasm_normal_721_bytes.as_slice());
    let wasm_normal_1155 = env
        .deployer()
        .upload_contract_wasm(wasm_normal_1155_bytes.as_slice());
    let wasm_lazy_721 = env
        .deployer()
        .upload_contract_wasm(wasm_lazy_721_bytes.as_slice());
    let wasm_lazy_1155 = env
        .deployer()
        .upload_contract_wasm(wasm_lazy_1155_bytes.as_slice());

    client.set_wasm_hashes(
        &wasm_normal_721,
        &wasm_normal_1155,
        &wasm_lazy_721,
        &wasm_lazy_1155,
    );

    (client, admin, fee_receiver, creator)
}

#[test]
fn deploys_normal_721_twice_with_unique_addresses() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.sequence_number = 1);
    let (client, _admin, _fee_receiver, creator) = setup_launchpad(&env);

    let salt_a = BytesN::from_array(&env, &[10u8; 32]);
    let salt_b = BytesN::from_array(&env, &[11u8; 32]);
    let royalty_receiver = Address::generate(&env);
    let currency = Address::generate(&env);

    let deployed_a = client.deploy_normal_721(
        &creator,
        &currency,
        &String::from_str(&env, "Creator 721 A"),
        &String::from_str(&env, "C721A"),
        &1_000u64,
        &500u32,
        &royalty_receiver,
        &salt_a,
    );

    let deployed_b = client.deploy_normal_721(
        &creator,
        &currency,
        &String::from_str(&env, "Creator 721 B"),
        &String::from_str(&env, "C721B"),
        &1_500u64,
        &500u32,
        &royalty_receiver,
        &salt_b,
    );

    assert_ne!(deployed_a, deployed_b);
    assert_eq!(client.collection_count(), 2u64);

    let all = client.all_collections();
    assert_eq!(all.len(), 2);
    assert!(matches!(
        all.get(0).unwrap().kind,
        CollectionKind::Normal721
    ));
    assert!(matches!(
        all.get(1).unwrap().kind,
        CollectionKind::Normal721
    ));
}

#[test]
fn deploys_normal_1155_twice_with_unique_addresses() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.sequence_number = 1);
    let (client, _admin, _fee_receiver, creator) = setup_launchpad(&env);

    let salt_a = BytesN::from_array(&env, &[20u8; 32]);
    let salt_b = BytesN::from_array(&env, &[21u8; 32]);
    let royalty_receiver = Address::generate(&env);
    let currency = Address::generate(&env);

    let deployed_a = client.deploy_normal_1155(
        &creator,
        &currency,
        &String::from_str(&env, "Creator 1155 A"),
        &500u32,
        &royalty_receiver,
        &salt_a,
    );

    let deployed_b = client.deploy_normal_1155(
        &creator,
        &currency,
        &String::from_str(&env, "Creator 1155 B"),
        &500u32,
        &royalty_receiver,
        &salt_b,
    );

    assert_ne!(deployed_a, deployed_b);
    assert_eq!(client.collection_count(), 2u64);

    let all = client.all_collections();
    assert_eq!(all.len(), 2);
    assert!(matches!(
        all.get(0).unwrap().kind,
        CollectionKind::Normal1155
    ));
    assert!(matches!(
        all.get(1).unwrap().kind,
        CollectionKind::Normal1155
    ));
}

#[test]
fn deploys_lazy_721_twice_with_unique_addresses() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.sequence_number = 1);
    let (client, _admin, _fee_receiver, creator) = setup_launchpad(&env);

    let salt_a = BytesN::from_array(&env, &[30u8; 32]);
    let salt_b = BytesN::from_array(&env, &[31u8; 32]);
    let creator_pubkey = BytesN::from_array(&env, &[7u8; 32]);
    let royalty_receiver = Address::generate(&env);
    let currency = Address::generate(&env);

    let deployed_a = client.deploy_lazy_721(
        &creator,
        &currency,
        &creator_pubkey,
        &String::from_str(&env, "Lazy 721 A"),
        &String::from_str(&env, "LZ7A"),
        &1_000u64,
        &750u32,
        &royalty_receiver,
        &salt_a,
    );

    let deployed_b = client.deploy_lazy_721(
        &creator,
        &currency,
        &creator_pubkey,
        &String::from_str(&env, "Lazy 721 B"),
        &String::from_str(&env, "LZ7B"),
        &1_200u64,
        &750u32,
        &royalty_receiver,
        &salt_b,
    );

    assert_ne!(deployed_a, deployed_b);
    assert_eq!(client.collection_count(), 2u64);

    let all = client.all_collections();
    assert_eq!(all.len(), 2);
    assert!(matches!(
        all.get(0).unwrap().kind,
        CollectionKind::LazyMint721
    ));
    assert!(matches!(
        all.get(1).unwrap().kind,
        CollectionKind::LazyMint721
    ));
}

#[test]
fn deploys_lazy_1155_twice_with_unique_addresses() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.sequence_number = 1);
    let (client, _admin, _fee_receiver, creator) = setup_launchpad(&env);

    let salt_a = BytesN::from_array(&env, &[40u8; 32]);
    let salt_b = BytesN::from_array(&env, &[41u8; 32]);
    let creator_pubkey = BytesN::from_array(&env, &[9u8; 32]);
    let royalty_receiver = Address::generate(&env);
    let currency = Address::generate(&env);

    let deployed_a = client.deploy_lazy_1155(
        &creator,
        &currency,
        &creator_pubkey,
        &String::from_str(&env, "Lazy 1155 A"),
        &600u32,
        &royalty_receiver,
        &salt_a,
    );

    let deployed_b = client.deploy_lazy_1155(
        &creator,
        &currency,
        &creator_pubkey,
        &String::from_str(&env, "Lazy 1155 B"),
        &600u32,
        &royalty_receiver,
        &salt_b,
    );

    assert_ne!(deployed_a, deployed_b);
    assert_eq!(client.collection_count(), 2u64);

    let all = client.all_collections();
    assert_eq!(all.len(), 2);
    assert!(matches!(
        all.get(0).unwrap().kind,
        CollectionKind::LazyMint1155
    ));
    assert!(matches!(
        all.get(1).unwrap().kind,
        CollectionKind::LazyMint1155
    ));
}

#[test]
fn deploy_calls_extend_instance_ttl() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.sequence_number = 1);
    let (client, _admin, _fee_receiver, creator) = setup_launchpad(&env);

    let royalty_receiver = Address::generate(&env);
    let currency = Address::generate(&env);

    // After initialize(), instance TTL is bumped to 100_000 ledgers.
    // Move forward so remaining TTL is below threshold (50_000),
    // then call deploy_* which should bump instance TTL again.
    jump_ledger(&env, 60_000);

    let salt_a = BytesN::from_array(&env, &[60u8; 32]);
    let _deployed_a = client.deploy_normal_721(
        &creator,
        &currency,
        &String::from_str(&env, "TTL A"),
        &String::from_str(&env, "TTLA"),
        &100u64,
        &500u32,
        &royalty_receiver,
        &salt_a,
    );

    // Without TTL extension on deploy, instance storage would now be expired:
    // 60_000 + 60_000 > 100_000.
    jump_ledger(&env, 60_000);

    let salt_b = BytesN::from_array(&env, &[61u8; 32]);
    let _deployed_b = client.deploy_normal_1155(
        &creator,
        &currency,
        &String::from_str(&env, "TTL B"),
        &500u32,
        &royalty_receiver,
        &salt_b,
    );

    assert_eq!(client.collection_count(), 2u64);
}

#[test]
fn admin_calls_extend_instance_ttl() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.sequence_number = 1);
    let (client, _admin, _fee_receiver, _creator) = setup_launchpad(&env);

    jump_ledger(&env, 60_000);

    let new_admin = Address::generate(&env);
    client.transfer_admin(&new_admin);

    jump_ledger(&env, 60_000);

    assert_eq!(client.admin(), new_admin);
}
