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
use spl_token::state::Account;
use std::{convert::TryInto, str::FromStr};
use borsh::BorshSerialize;
use sha2::{Sha256, Digest};
use crate::instructions::EscrowInstructions;
use crate::state::{EscrowAccountState, PartnerAccountState};
use crate::error::TradeError;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instructions = EscrowInstructions::unpack(instruction_data)?;

    match instructions {
        EscrowInstructions::CreateEscrow {
            partner,
            partner_asset_amount
        } => {
            create_escrow(
                program_id,
                accounts,
                partner,
                partner_asset_amount,
            )
        }
    }
}

fn create_escrow(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    partner: String,
    partner_asset_amount: u64
) -> ProgramResult {
    let accounts_info_iter = &mut accounts.iter();
    let creator = next_account_info(accounts_info_iter)?;

    // Verify trade creator is the signer
    if !creator.is_signer {
        msg!("Signer error");
        return Err(ProgramError::MissingRequiredSignature)
    }

    // Verify partner address is valid address
    match Pubkey::from_str(&partner.as_str()) {
        Ok(_pk) => {
        }
        Err(e) => {
            msg!("Invalid partner address {}", e);
            return Err(TradeError::DataError.into())
        }
    }

    // Verify amount of partner's asset
    if partner_asset_amount <= 0 || partner_asset_amount > u64::MAX {
        msg!("Invalid partner asset amount");
        return Err(TradeError::DataError.into());
    }

    // Get creator's token account for asset to be sent
    let sending_asset_account = next_account_info(accounts_info_iter)?;
    let sending_asset_data = sending_asset_account.data.borrow();
    let sending_asset_info = Account::unpack(&sending_asset_data)?;

    if *sending_asset_account.owner != spl_token::ID || !sending_asset_info.is_initialized() {
        msg!("Invalid sending asset token account");
        return Err(TradeError::InvalidTokenAccount.into())
    }
    // any more validation needed??????????????????

    // Get creator's token account for asset to be recieved
    let receiving_asset_account = next_account_info(accounts_info_iter)?;
    let receiving_asset_data = receiving_asset_account.data.borrow();
    let receiving_asset_info = Account::unpack(&receiving_asset_data)?;

    if *receiving_asset_account.owner != spl_token::ID || !receiving_asset_info.is_initialized() {
        msg!("Invalid receiving asset token account");
        return Err(TradeError::InvalidTokenAccount.into())
    }
    // any more validation needed??????????????????

    // Get and validate escrow & partner pda and data
    let escrow_pda = next_account_info(accounts_info_iter)?;
    let partner_pda = next_account_info(accounts_info_iter)?;

    // Escrow
    let mut hasher = Sha256::new();
    let mut input: String = creator.key.to_string();
    input.push_str(&partner);
    input.push_str(&sending_asset_info.mint.to_string());
    input.push_str(&receiving_asset_info.mint.to_string());
    hasher.update(input);
    let trade_hash: String = format!("{:x}", hasher.finalize());

    let (_escrow_pda, escrow_bump) = Pubkey::find_program_address(
        &[trade_hash[..32].as_bytes().as_ref()],
        program_id
    );

    if *escrow_pda.key != _escrow_pda {
        msg!("Creator PDAs do not match");
        return Err(TradeError::InvalidPDA.into())
    }

    // Get rent info for escrow PDA
    let escrow_length: usize =
        1 +
        (4 + trade_hash.len()) +
        (4 + creator.key.to_string().len()) +
        (4 + sending_asset_account.key.to_string().len()) +
        (4 + receiving_asset_account.key.to_string().len()) +
        (4 + partner.len()) +
        (4 + receiving_asset_info.mint.to_string().len()) +
        8;
    let escrow_rent = Rent::get()?;
    let escrow_rent_lamports = escrow_rent.minimum_balance(escrow_length);

    // Retrieve system_program to create PDAs
    let system_program = next_account_info(accounts_info_iter)?;

    // Create escrow PDA
    invoke_signed(
        &system_instruction::create_account(
            creator.key,
            escrow_pda.key,
            escrow_rent_lamports,
            escrow_length.try_into().unwrap(),
            program_id,
        ),
        &[creator.clone(), escrow_pda.clone(), system_program.clone()],
        &[&[trade_hash[..32].as_bytes().as_ref(), &[escrow_bump]]],
    )?;

    // Retrieve escrow PDA data
    let mut escrow_data = try_from_slice_unchecked::<EscrowAccountState>(&escrow_pda.data.borrow()).unwrap();

    // Ensure escrow PDA is not already initialized
    if escrow_data.is_initialized() {
        msg!("Escrow PDA already initialized");
        return Err(ProgramError::AccountAlreadyInitialized)
    }

    msg!("receiving_asset_info.mint.to_string() {}", receiving_asset_info.mint.to_string());

    // Store escrow data
    escrow_data.is_initialized = true;
    escrow_data.hash = trade_hash.clone();
    escrow_data.creator = creator.key.to_string();
    escrow_data.sending_asset_account = sending_asset_account.key.to_string();
    escrow_data.receiving_asset_account = receiving_asset_account.key.to_string();
    escrow_data.partner = partner.clone();
    escrow_data.partner_asset = receiving_asset_info.mint.to_string();
    escrow_data.partner_asset_amount = partner_asset_amount;

    // Commit escrow data
    escrow_data.serialize(&mut &mut escrow_pda.data.borrow_mut()[..])?;

    // Partner
    hasher = Sha256::new();
    input = trade_hash.clone();
    input.push_str(&partner);
    hasher.update(input);
    let partner_hash: String = format!("{:x}", hasher.finalize());

    let (_partner_pda, partner_bump) = Pubkey::find_program_address(
        &[partner_hash[..32].as_bytes().as_ref()],
        program_id
    );

    if *partner_pda.key != _partner_pda {
        msg!("Partner PDAs do not match");
        return Err(TradeError::InvalidPDA.into())
    }

    // Get rent info for partner PDA
    let partner_length: usize =
        1 +
        (4 + trade_hash.len()) +
        (4 + partner.len());
    let partner_rent = Rent::get()?;
    let partner_rent_lamports = partner_rent.minimum_balance(partner_length);

    // Create partner PDA
    invoke_signed(
        &system_instruction::create_account(
            creator.key,
            partner_pda.key,
            partner_rent_lamports,
            partner_length.try_into().unwrap(),
            program_id,
        ),
        &[creator.clone(), partner_pda.clone(), system_program.clone()],
        &[&[partner_hash[..32].as_bytes().as_ref(), &[partner_bump]]],
    )?;

    // Retrieve partner PDA data
    let mut partner_data = try_from_slice_unchecked::<PartnerAccountState>(&partner_pda.data.borrow()).unwrap();

    // Ensure partner PDA is not already initialized
    if partner_data.is_initialized() {
        msg!("Partner PDA already initialized");
        return Err(ProgramError::AccountAlreadyInitialized)
    }

    // Store partner data
    partner_data.is_initialized = true;
    partner_data.hash = trade_hash.clone();
    partner_data.pubkey = partner.clone();

    // Commit new PDA data
    partner_data.serialize(&mut &mut partner_pda.data.borrow_mut()[..])?;

    Ok(())
}
