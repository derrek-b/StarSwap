use borsh::{ BorshDeserialize }
use solana_program::{ program_error::ProgramError }

pub Enum TradeInstructions {
    CreateTrade::{
        trader1: Pubkey,
        asset1: Pubkey,
        asset1_amount: u32,
        trader2: Pubkey,
        asset2: Pubkey,
        asset2_amount: u32,
    }
}

#[derive(BorshDeserialize)]
struct TradePayload {
    trader1: Pubkey,
    asset1: Pubkey,
    asset1_amount: u32,
    trader2: Pubkey,
    asset2: Pubkey,
    asset2_amount: u32,
}

impl TradeInstructions {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (&variant: u8, rest: &[u8]) = input.split_first().ok_or(err: ProgramError::InvalidInstructionData)?;
        let payload: TradePayload = TradePayload::try_from_slice(rest).unwrap();

        Ok(match variant {
            0 => Self::CreateTrade {
                trader1: payload.trader1,
                asset1: payload.asset1,
                asset1_amount: payload.asset1_amount,
                trader2: payload.trader2,
                asset2: payload.asset2,
                asset2_amount: payload.asset2_amount },
            _ => return Err(ProgramError::InvalidInstructionData)
        })
    }
}
