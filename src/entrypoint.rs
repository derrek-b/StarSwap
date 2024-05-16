use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    entrypoint,
    msg,
    pubkey::Pubkey
};
use crate::processor;

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!(
        "process_instructions: {}, {} accounts, data is {} bytes",
        program_id,
        accounts.len(),
        instruction_data.len(),
    );

    //processor::process_instruction(program_id, accounts, instruction_data)?;

    Ok(())
}
