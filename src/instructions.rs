use borsh::BorshDeserialize;
use solana_program::{ program_error::ProgramError, pubkey::Pubkey, msg };

pub enum EscrowInstructions {
    // ACCOUNTS NEEDED
    // 1 [signer] creator
    // 2 [writable] token account containing asset creator is sending
    // 3 [] token account for asset creator is receiving
    // 4 [] program pda containing trade data, will be signer for transfering assets when trade is completed
    CreateEscrow {
        partner: String,
        partner_asset_amount: u64,
    },
}

#[derive(BorshDeserialize, Debug)]
struct EscrowPayload {
    partner: String,
    partner_asset_amount: u64,
}

impl EscrowInstructions {
    pub fn unpack(input: &[u8]) -> Result<EscrowInstructions, ProgramError> {
        let (&variant, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;

        Ok(match variant {
            0 => {
                let payload: EscrowPayload = EscrowPayload::try_from_slice(rest).unwrap();
                Self::CreateEscrow {
                    partner: payload.partner,
                    partner_asset_amount: payload.partner_asset_amount }
                },
            _ => return Err(ProgramError::InvalidInstructionData)
        })
    }
}
