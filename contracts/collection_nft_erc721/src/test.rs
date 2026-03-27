extern crate std;

use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, Env, String};

use crate::{DataKey, NormalNFT721, NormalNFT721Client};

fn jump_ledger(env: &Env, delta: u32) {
    env.ledger().with_mut(|li| {
        li.sequence_number += delta;
    });
}

fn setup() -> (
    Env,
    NormalNFT721Client<'static>,
    Address, /*contract_id*/
    Address, /*creator*/
) {
    let env = Env::default();
    env.ledger().with_mut(|li| li.sequence_number = 1);
    env.mock_all_auths();

    let contract_id = env.register(NormalNFT721, ());
    let client = NormalNFT721Client::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let royalty_receiver = Address::generate(&env);

    client.initialize(
        &creator,
        &String::from_str(&env, "Test Collection 721"),
        &String::from_str(&env, "T721"),
        &1_000u64,
        &500u32,
        &royalty_receiver,
    );

    (env, client, contract_id, creator)
}

#[test]
fn instance_ttl_is_extended_on_mint() {
    let (env, client, _contract_id, _creator) = setup();

    let alice = Address::generate(&env);

    // After init, instance TTL is bumped by the initializer.
    // Move past the threshold so missing "extend_instance_ttl" on mint would expire it.
    jump_ledger(&env, 60_000);
    let token_id_0 = client.mint(&alice, &String::from_str(&env, "uri-0"));

    jump_ledger(&env, 60_000);
    let token_id_1 = client.mint(&alice, &String::from_str(&env, "uri-1"));

    assert_eq!(token_id_0, 0u64);
    assert_eq!(token_id_1, 1u64);
}

#[test]
fn persistent_ttl_is_extended_on_transfer_keys() {
    let (env, client, contract_id, _creator) = setup();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let token_id = client.mint(&alice, &String::from_str(&env, "uri"));

    client.transfer(&alice, &bob, &token_id);

    // Jump beyond TTL_THRESHOLD. If transfer() didn't extend TTL for the
    // updated keys, they'd disappear.
    jump_ledger(&env, 60_000);

    let (owner_has, alice_balance_has) = env.as_contract(&contract_id, || {
        let owner_has = env.storage().persistent().has(&DataKey::Owner(token_id));
        let alice_balance_has = env
            .storage()
            .persistent()
            .has(&DataKey::BalanceOf(alice.clone()));
        (owner_has, alice_balance_has)
    });

    assert!(owner_has);
    assert!(alice_balance_has);
    assert_eq!(client.owner_of(&token_id), bob);
}

#[test]
fn persistent_ttl_is_extended_on_burn_balance_key() {
    let (env, client, contract_id, _creator) = setup();

    let alice = Address::generate(&env);

    let token_id = client.mint(&alice, &String::from_str(&env, "uri"));
    // NormalNFT721's burn() path checks explicit approval (via Approved(token_id)),
    // so set a self-approval first to keep this test focused on TTL behavior.
    client.approve(&alice, &alice, &token_id);
    client.burn(&alice, &token_id);

    jump_ledger(&env, 60_000);

    let (owner_has, alice_balance_has) = env.as_contract(&contract_id, || {
        let owner_has = env.storage().persistent().has(&DataKey::Owner(token_id));
        let alice_balance_has = env
            .storage()
            .persistent()
            .has(&DataKey::BalanceOf(alice.clone()));
        (owner_has, alice_balance_has)
    });

    // burn() intentionally removes the token ownership key
    assert!(!owner_has);
    // but BalanceOf must still be kept alive.
    assert!(alice_balance_has);
}
