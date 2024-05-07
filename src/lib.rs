//use borsh::{ BorshDeserialize, BorshSerialize };
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh1::try_from_slice_unchecked,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar}
};
use sha2::{Sha256, Digest};
use borsh::BorshSerialize;
use std::{convert::TryInto, env::join_paths};

pub mod instructions;
use instructions::TradeInstructions;

pub mod state;
use state::TradeAccountState;

entrypoint!(process_instruction);

fn process_instruction (
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instructions = TradeInstructions::unpack(instruction_data)?;

    match instructions {
        TradeInstructions::CreateTrade {
            trader1,
            asset1,
            asset1_amount,
            trader2,
            asset2,
            asset2_amount
        } => {
            create_trade(
                program_id,
                accounts,
                trader1,
                asset1,
                asset1_amount,
                trader2,
                asset2,
                asset2_amount
            )
        }
    }
}

fn create_trade(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    trader1: String,
    asset1: String,
    asset1_amount: u32,
    trader2: String,
    asset2: String,
    asset2_amount: u32
) -> ProgramResult {
    // msg!("{} sent {} of {} to ", trader1, asset1_amount, asset1);
    // msg!("{} for {} of {}", trader2, asset2_amount, asset2);
    // msg!("{}, {:?}", program_id, accounts);

    let accounts_info_iter = &mut accounts.iter();

    let creator = next_account_info(accounts_info_iter)?;
    //msg!("creator {:?}", creator);
    let pda_account = next_account_info(accounts_info_iter)?;
    //msg!("pda {:?}", pda_account);
    let system_program = next_account_info(accounts_info_iter)?;
    //msg!("system program {:?}", system_program);

    let mut hasher = Sha256::new();
    let mut input: String = trader1.clone();
    input.push_str(&asset1);
    input.push_str(&trader2);
    input.push_str(&asset2);
    //msg!("input {}", input);
    hasher.update(input);
    let result: String = format!("{:x}", hasher.finalize());
    //msg!(&result);

    let (pda, bump_seed) = Pubkey::find_program_address(&[result[..32].as_bytes().as_ref()], program_id);

    msg!("pda {}", pda);

    let account_length: usize = 1 + (4 + trader1.len()) + (4 + asset1.len()) + 4 + (4 + trader2.len()) + (4 + asset2.len()) + 4;
    let rent = Rent::get()?;
    let rent_lamports = rent.minimum_balance(account_length);

    invoke_signed(
        &system_instruction::create_account(
            creator.key,
            pda_account.key,
            rent_lamports,
            account_length.try_into().unwrap(),
            program_id,
        ),
        &[creator.clone(), pda_account.clone(), system_program.clone()],
        &[&[result[..32].as_bytes().as_ref(), &[bump_seed]]],
    )?;

    msg!("pda created...");

    let mut pda_data = try_from_slice_unchecked::<TradeAccountState>(&pda_account.data.borrow()).unwrap();
    msg!("data borrowed...");

    pda_data.is_active = true;
    pda_data.trader1 = trader1;
    pda_data.asset1 = asset1;
    pda_data.asset1_amount = asset1_amount;
    pda_data.trader2 = trader2;
    pda_data.asset2 = asset2;
    pda_data.asset2_amount = asset2_amount;

    pda_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;
    msg!("account data stored!!!");

    Ok(())
}
