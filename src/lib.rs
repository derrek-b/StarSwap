//use borsh::{ BorshDeserialize, BorshSerialize };
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh1::try_from_slice_unchecked,
    entrypoint::ProgramResult,
    entrypoint,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar}
};
use sha2::{Sha256, Digest};
use borsh::BorshSerialize;

pub mod instructions;
use instructions::TradeInstructions;

pub mod state;
use state::{ TradeAccountState, TradeIndexState };

entrypoint!(process_instruction);

fn process_instruction (
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instructions = TradeInstructions::unpack(instruction_data)?;

    match instructions {
        TradeInstructions::CreateTrade {
            user,
            user_asset,
            user_asset_amount,
            partner,
            partner_asset,
            partner_asset_amount
        } => {
            create_trade(
                program_id,
                accounts,
                user,
                user_asset,
                user_asset_amount,
                partner,
                partner_asset,
                partner_asset_amount
            )
        }
    }
}

fn create_trade(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    user: String,
    user_asset: String,
    user_asset_amount: u32,
    partner: String,
    partner_asset: String,
    partner_asset_amount: u32
) -> ProgramResult {
    let accounts_info_iter = &mut accounts.iter();
    let creator = next_account_info(accounts_info_iter)?;
    //let pda_account = next_account_info(accounts_info_iter)?;
    let creator_pda = next_account_info(accounts_info_iter)?;
    let partner_pda = next_account_info(accounts_info_iter)?;
    let _index_pda = next_account_info(accounts_info_iter)?;
    let system_program = next_account_info(accounts_info_iter)?;

    let index = get_trade_index(accounts, program_id)?;

    // let mut hasher = Sha256::new();
    // let mut input: String = trader1.clone();
    // input.push_str(&asset1);
    // input.push_str(&trader2);
    // input.push_str(&asset2);
    // hasher.update(input);
    // let result: String = format!("{:x}", hasher.finalize());

    // Get PDAs & bumps
    //let (_pda, bump_seed) = Pubkey::find_program_address(&[result[..32].as_bytes().as_ref()], program_id);
    // Creator
    let mut hasher = Sha256::new();
    let mut input: String = user.clone();
    input.push_str(&index.to_string());
    hasher.update(input);
    let creator_result: String = format!("{:x}", hasher.finalize());

    let (_creator_pda, creator_bump) = Pubkey::find_program_address(
        &[creator_result[..32].as_bytes().as_ref()],
        program_id
    );

    msg!("creator_pda: {}", _creator_pda);

    // Partner
    hasher = Sha256::new();
    input = partner.clone();
    input.push_str(&index.to_string());
    hasher.update(input);
    let partner_result = format!("{:x}", hasher.finalize());

    let (_partner_pda, partner_bump) = Pubkey::find_program_address(
        &[partner_result[..32].as_bytes().as_ref()],
        program_id
    );

    // Get rent info for PDAs
    //let account_length: usize = 1 + (4 + trader1.len()) + (4 + asset1.len()) + 4 + (4 + trader2.len()) + (4 + asset2.len()) + 4;
    let account_length: usize = 8 + 1 + (4 + user.len()) + (4 + user_asset.len()) + 4 + (4 + partner.len()) + (4 + partner_asset.len()) + 4;
    let rent = Rent::get()?;
    let rent_lamports = rent.minimum_balance(account_length);

    // Create PDAs for trade creator and partner
    // Creator
    invoke_signed(
        &system_instruction::create_account(
            creator.key,
            creator_pda.key,
            rent_lamports,
            account_length.try_into().unwrap(),
            program_id,
        ),
        &[creator.clone(), creator_pda.clone(), system_program.clone()],
        &[&[creator_result[..32].as_bytes().as_ref(), &[creator_bump]]],
    )?;

    // Partner
    invoke_signed(
        &system_instruction::create_account(
            creator.key,
            partner_pda.key,
            rent_lamports,
            account_length.try_into().unwrap(),
            program_id,
        ),
        &[creator.clone(), partner_pda.clone(), system_program.clone()],
        &[&[partner_result[..32].as_bytes().as_ref(), &[partner_bump]]],
    )?;

    // Retrieve PDA data
    //let mut pda_data = try_from_slice_unchecked::<TradeAccountState>(&pda_account.data.borrow()).unwrap();
    let mut creator_data = try_from_slice_unchecked::<TradeAccountState>(&creator_pda.data.borrow()).unwrap();
    let mut partner_data = try_from_slice_unchecked::<TradeAccountState>(&partner_pda.data.borrow()).unwrap();

    // Update PDA data
    // pda_data.active = true;
    // pda_data.trader1 = trader1;
    // pda_data.asset1 = asset1;
    // pda_data.asset1_amount = asset1_amount;
    // pda_data.trader2 = trader2;
    // pda_data.asset2 = asset2;
    // pda_data.asset2_amount = asset2_amount;

    // Creator
    creator_data.index = index;
    creator_data.is_creator = true;
    creator_data.user = user.clone();
    creator_data.user_asset = user_asset.clone();
    creator_data.user_asset_amount = user_asset_amount;
    creator_data.partner = partner.clone();
    creator_data.partner_asset = partner_asset.clone();
    creator_data.partner_asset_amount = partner_asset_amount;

    // Partner
    partner_data.index = index;
    partner_data.is_creator = false;
    partner_data.user = partner.clone();
    partner_data.user_asset = partner_asset.clone();
    partner_data.user_asset_amount = partner_asset_amount;
    partner_data.partner = user.clone();
    partner_data.partner_asset = user_asset.clone();
    partner_data.partner_asset_amount = user_asset_amount;

    // Update PDA data
    // pda_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;
    creator_data.serialize(&mut &mut creator_pda.data.borrow_mut()[..])?;
    partner_data.serialize(&mut &mut partner_pda.data.borrow_mut()[..])?;

    Ok(())
}

fn get_trade_index(accounts: &[AccountInfo], program_id: &Pubkey) -> Result<u64, ProgramError> {
    let accounts_info_iter = &mut accounts.iter();
    let creator = next_account_info(accounts_info_iter)?;
    let _creator_pda = next_account_info(accounts_info_iter)?;
    let _partner_pda = next_account_info(accounts_info_iter)?;
    let index_pda = next_account_info(accounts_info_iter)?;
    let system_program = next_account_info(accounts_info_iter)?;

    let (_pda, bump_seed) = Pubkey::find_program_address(&["tradeindex".as_bytes().as_ref()], program_id);

    if index_pda.data_is_empty() {
        let account_length: usize = 8;
        let rent = Rent::get()?;
        let rent_lamports = rent.minimum_balance(8);

        invoke_signed(
            &system_instruction::create_account(
                creator.key,
                index_pda.key,
                rent_lamports,
                account_length.try_into().unwrap(),
                program_id,
            ),
            &[creator.clone(), index_pda.clone(), system_program.clone()],
            &[&["tradeindex".as_bytes().as_ref(), &[bump_seed]]],
        )?;
    }

    let mut index_data = try_from_slice_unchecked::<TradeIndexState>(&index_pda.data.borrow()).unwrap();
    msg!("index: {}", index_data.index);

    index_data.index += 1;

    index_data.serialize(&mut &mut index_pda.data.borrow_mut()[..])?;

    Ok(index_data.index)
}
