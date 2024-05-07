use borsh::BorshDeserialize;
use solana_program::{ program_error::ProgramError, pubkey::Pubkey, msg };

pub enum TradeInstructions {
    CreateTrade {
        trader1: String,
        asset1: String,
        asset1_amount: u32,
        trader2: String,
        asset2: String,
        asset2_amount: u32,
    }
}

#[derive(BorshDeserialize, Debug)]
struct TradePayload {
    trader1: String,
    asset1: String,
    asset1_amount: u32,
    trader2: String,
    asset2: String,
    asset2_amount: u32,
}

impl TradeInstructions {
    pub fn unpack(input: &[u8]) -> Result<TradeInstructions, ProgramError> {
        let (&variant, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;
        let payload: TradePayload = TradePayload::try_from_slice(rest).unwrap();
        //msg!("Variant {} Payload {:?}", variant, payload);

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

        //Ok((variant))
    }
}
