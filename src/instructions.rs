use borsh::BorshDeserialize;
use solana_program::{ program_error::ProgramError, pubkey::Pubkey, msg };

pub enum TradeInstructions {
    CreateTrade {
        user: String,
        user_asset: String,
        user_asset_amount: u32,
        partner: String,
        partner_asset: String,
        partner_asset_amount: u32,
    },
}

#[derive(BorshDeserialize, Debug)]
struct TradePayload {
    user: String,
    user_asset: String,
    user_asset_amount: u32,
    partner: String,
    partner_asset: String,
    partner_asset_amount: u32,
}

impl TradeInstructions {
    pub fn unpack(input: &[u8]) -> Result<TradeInstructions, ProgramError> {
        let (&variant, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;
        let payload: TradePayload = TradePayload::try_from_slice(rest).unwrap();
        //msg!("Variant {} Payload {:?}", variant, payload);

        Ok(match variant {
            0 => Self::CreateTrade {
                user: payload.user,
                user_asset: payload.user_asset,
                user_asset_amount: payload.user_asset_amount,
                partner: payload.partner,
                partner_asset: payload.partner_asset,
                partner_asset_amount: payload.partner_asset_amount },
            _ => return Err(ProgramError::InvalidInstructionData)
        })
    }
}
