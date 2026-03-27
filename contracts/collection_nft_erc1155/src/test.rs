extern crate std;

use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, Env, String};

use crate::{DataKey, NormalNFT1155, NormalNFT1155Client};

fn jump_ledger(env: &Env, delta: u32) {
    env.ledger().with_mut(|li| {
        li.sequence_number += delta;
    });
}

fn setup() -> (
    Env,
    NormalNFT1155Client<'static>,
    Address, /*contract_id*/
    Address, /*creator*/
) {
    let env = Env::default();
    env.ledger().with_mut(|li| li.sequence_number = 1);
    env.mock_all_auths();

    let contract_id = env.register(NormalNFT1155, ());
    let client = NormalNFT1155Client::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let royalty_receiver = Address::generate(&env);

    client.initialize(
        &creator,
        &String::from_str(&env, "Test 1155"),
        &500u32,
        &royalty_receiver,
    );

    (env, client, contract_id, creator)
}

#[test]
fn instance_ttl_is_extended_on_mint_new() {
    let (env, client, _contract_id, _creator) = setup();

    let alice = Address::generate(&env);

    jump_ledger(&env, 60_000);
    let token_id_0 = client.mint_new(&alice, &10u128, &String::from_str(&env, "uri-0"));

    jump_ledger(&env, 60_000);
    let token_id_1 = client.mint_new(&alice, &5u128, &String::from_str(&env, "uri-1"));

    assert_eq!(token_id_0, 0u64);
    assert_eq!(token_id_1, 1u64);
}

#[test]
fn persistent_ttl_is_extended_on_transfer_and_mint_keys() {
    let (env, client, contract_id, _creator) = setup();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let token_id = client.mint_new(&alice, &10u128, &String::from_str(&env, "uri"));

    client.transfer(&alice, &bob, &token_id, &3u128);

    jump_ledger(&env, 60_000);

    let (alice_balance_has, total_supply_has) = env.as_contract(&contract_id, || {
        let alice_balance_has = env
            .storage()
            .persistent()
            .has(&DataKey::Balance(alice.clone(), token_id));
        let total_supply_has = env
            .storage()
            .persistent()
            .has(&DataKey::TotalSupply(token_id));
        (alice_balance_has, total_supply_has)
    });

    assert!(alice_balance_has);
    assert!(total_supply_has);
}

#[test]
fn persistent_ttl_is_extended_on_burn_keys() {
    let (env, client, contract_id, _creator) = setup();

    let alice = Address::generate(&env);

    let token_id = client.mint_new(&alice, &10u128, &String::from_str(&env, "uri"));

    client.burn(&alice, &alice, &token_id, &4u128);

    jump_ledger(&env, 60_000);

    let (alice_balance_has, total_supply_has) = env.as_contract(&contract_id, || {
        let alice_balance_has = env
            .storage()
            .persistent()
            .has(&DataKey::Balance(alice.clone(), token_id));
        let total_supply_has = env
            .storage()
            .persistent()
            .has(&DataKey::TotalSupply(token_id));
        (alice_balance_has, total_supply_has)
    });

    assert!(alice_balance_has);
    assert!(total_supply_has);
}
