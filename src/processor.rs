use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh1::try_from_slice_unchecked,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};
use spl_token::state::{Account, Mint};
use spl_token::state::is_initialized_account;
use std::convert::TryInto;
use borsh::BorshSerialize;
use sha2::{Sha256, Digest};
use crate::instructions::TradeInstructions;
use crate::state::{TradeAccountState, TradeIndexState};
use crate::error::TradeError;

pub fn process_instruction(
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
    let creator_pda = next_account_info(accounts_info_iter)?;
    let partner_pda = next_account_info(accounts_info_iter)?;
    let _index_pda = next_account_info(accounts_info_iter)?;
    let creator_asset_mint = next_account_info(accounts_info_iter)?;
    let creator_asset_ata = next_account_info(accounts_info_iter)?;
    let system_program = next_account_info(accounts_info_iter)?;

    // Verify trade creator is the signer
    if !creator.is_signer || creator.key.to_string() != user {
        msg!("Signer error");
        return Err(ProgramError::MissingRequiredSignature)
    }

    // Verify user asset mint and user asset data
    let user_asset_mint_data = creator_asset_mint.data.borrow();
    let user_asset_mint_state = Mint::unpack(&user_asset_mint_data)?;
    let user_asset_ata_data = creator_asset_ata.data.borrow();
    let user_asset_ata_state = Account::unpack(&user_asset_ata_data)?;

    msg!("{}", user_asset);
    msg!("{}", user_asset_ata_state.mint.to_string());
    msg!("{}", creator_asset_mint.key);
    if &user_asset_ata_state.mint != creator_asset_mint.key || user_asset != user_asset_ata_state.mint.to_string() {
        msg!("Token account doesn't match the expected mint");
        return Err(TradeError::DataError.into());
    }

    // Verify user has the assets to transfer
    if user_asset_ata_state.amount < (user_asset_amount as u64 * u64::checked_pow(10 as u64, user_asset_mint_state.decimals as u32).unwrap()) {
        msg!("Insufficient balance");
        return Err(TradeError::InsufficientBalance.into())
    }

    // Verify partner asset mint
    //let partner_asset_mint_data = partner_asset_mint.data.borrow();
    //let partner_asset_mint_state = Mint::unpack(&partner_asset_mint_data)?;
    // if !is_initialized_account(&partner_asset_mint_data) {
    //     msg!("Partner asset mint not initialized");
    //     return  Err(TradeError::DataError.into());
    // }

    // Get unique trade index for PDA creation and trade tracking
    let index = get_trade_index(accounts, program_id)?;

    // Get PDAs & bumps
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

    // Validate PDA input
    if *creator_pda.key != _creator_pda {
        msg!("Creator PDAs do not match");
        return Err(TradeError::InvalidPDA.into())
    }

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

    // Validate PDA input
    if *partner_pda.key != _partner_pda {
        msg!("Partner PDAs do not match");
        return Err(TradeError::InvalidPDA.into())
    }

    // Get rent info for PDAs
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
    let mut creator_data = try_from_slice_unchecked::<TradeAccountState>(&creator_pda.data.borrow()).unwrap();
    let mut partner_data = try_from_slice_unchecked::<TradeAccountState>(&partner_pda.data.borrow()).unwrap();

    // Update PDA data
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

    // Commit new PDA data
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
    let _creator_asset_mint = next_account_info(accounts_info_iter)?;
    let _creator_asset_ata = next_account_info(accounts_info_iter)?;
    let system_program = next_account_info(accounts_info_iter)?;

    let (pda, bump_seed) = Pubkey::find_program_address(&["tradeindex".as_bytes().as_ref()], program_id);

    if *index_pda.key != pda {
        msg!("Invalid index PDA");
        return Err(TradeError::InvalidPDA.into())
    }

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
