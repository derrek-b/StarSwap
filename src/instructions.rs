use borsh::BorshDeserialize;
use solana_program::{ msg, program_error::ProgramError, pubkey::{ParsePubkeyError, Pubkey} };

pub enum EscrowInstructions {
    // ACCOUNTS NEEDED TO CREATE TRADE
    // 1 [signer] creator
    // 2 [] token account containing asset creator is sending (becomes writable if ownership transfer is moved inside solana program)
    // 3 [] token account for asset creator is receiving
    // 4 [writable] program pda containing escrow data, will be signer for transfering assets when trade is completed
    // 5 [writable] program pda containing partner data
    // 6 [] system_program
    CreateEscrow {
        partner: String,
        partner_asset_amount: u64,
    },
    // ACCOUNTS NEEDED FOR CANCELING TRADE
    // 1 [signer] user canceling the trade, either the creator or the partner
    // 2 [writable] program PDA that stores trade info and owns account #3
    // 3 [writable] token account containing creator's asset (temp account transferred to PDA's ownership)
    // 4 [writable] program PDA that stores partner data
    // 5 [writable] creator's ATA that escrowed assets will be returned to
    // 6 [] token program
    // 7 [writable] creator's native account to return rent fees from closed temp token account and PDAs
    //   (only included if signer of cancel instruction is the trade partner and not the creator)
    CancelEscrow {
        hash: String,
        cancel_by_creator: bool,
    },
    // ACCOUNTS NEEDED FOR ACCEPTING/FINALIZING TRADE
    // 1 [signer] user (trade partner) that is accepting the trade proposed by the creator
    // 2 [writable] program PDA that stores trade info and owns account #3
    // 3 [writable] token account containing creator's asset (temp account transferred to PDA's ownership)
    // 4 [writable] program PDA that stores partner data
    // 5 [writable] creator's ATA that will receive assets from partner
    // 6 [writable] partner's ATA that will send assets to creator's ATA (account #5)
    // 7 [writable] parter's ATA that will receive assets from temp token account (account #3)
    // 8 [] token program
    // 9 [writable] creator's native account to return rent fees from closed temp token account and PDAs
    AcceptEscrow {
        hash: String,
    }
}

#[derive(BorshDeserialize, Debug)]
struct CreateEscrowPayload {
    partner: String,
    partner_asset_amount: u64,
}

#[derive(BorshDeserialize, Debug)]
struct CancelEscrowPayload {
    hash: String,
    cancel_by_creator: bool,
}

#[derive(BorshDeserialize, Debug)]
struct AcceptEscrowPayload {
    hash: String,
}

impl EscrowInstructions {
    pub fn unpack(input: &[u8]) -> Result<EscrowInstructions, ProgramError> {
        let (&variant, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;

        Ok(match variant {
            0 => {
                let payload: CreateEscrowPayload = CreateEscrowPayload::try_from_slice(rest).unwrap();
                Self::CreateEscrow {
                    partner: payload.partner,
                    partner_asset_amount: payload.partner_asset_amount }
                },
            1 => {
                let payload: CancelEscrowPayload = CancelEscrowPayload::try_from_slice(rest).unwrap();
                Self::CancelEscrow {
                    hash: payload.hash,
                    cancel_by_creator: payload.cancel_by_creator,
                }
            },
            2 => {
                let payload: AcceptEscrowPayload = AcceptEscrowPayload::try_from_slice(rest).unwrap();
                Self::AcceptEscrow {
                    hash: payload.hash,
                }
            }
            _ => return Err(ProgramError::InvalidInstructionData)
        })
    }
}
