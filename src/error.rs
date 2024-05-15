use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TradeError {
    #[error("PDA parameter is invalid")]
    InvalidPDA,
    #[error("Invalid user account")]
    InvalidAccount,
    #[error("Data error")]
    DataError,
    #[error("Insufficient balance")]
    InsufficientBalance,
    #[error("Invalid token account")]
    InvalidTokenAccount,
}

impl From<TradeError> for ProgramError {
    fn from(value: TradeError) -> Self {
        ProgramError::Custom(value as u32)
    }
}
