use borsh::{ BorshDeserialize, BorshSerialize };
use solana_program::{
    account_info::{ next_account_info, AccountInfo },
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

pub mod instructions;
use instructions::{ TradeInstructions }

entrypoint!(process_instruction);

fn process_instruction (
    program_id: &Pubkey,
    accounts: $[AccountInfo],
    instruction_data: $[u8],
) -> ProgramResult {
    let instructions = TradeInstructions::unpack(input: instruction_data)?;

    match instructions {
        TradeInstructions::CreateTrade {
            trader1: Pubkey,
            asset1: Pubkey,
            asset1_amount: u64,
            trader2: Pubkey,
            asset2: Pubkey,
            asset2_amount: u64,
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
    program_id,
    accounts,
    trader1,
    asset1,
    asset1_amount,
    trader2,
    asset2,
    asset2_amount
) -> ProgramResult {
    msg!('{} sent {} of {} to ', trader1, asset1_amount, asset1)
    msg!('{} from {} of {}', trader2, asset2_amount, asset2)
}
