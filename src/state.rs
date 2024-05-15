use borsh::{BorshSerialize, BorshDeserialize};
use solana_program::program_pack::{IsInitialized, Sealed};

// #[derive(BorshSerialize, BorshDeserialize)]
// pub struct TradeAccountState {
//     pub is_initialized: bool,
//     pub index: u64,
//     pub is_creator: bool,
//     pub user: String,
//     pub user_asset: String,
//     pub user_asset_amount: u32,
//     pub partner: String,
//     pub partner_asset: String,
//     pub partner_asset_amount: u32,
// }

#[derive(BorshSerialize, BorshDeserialize)]
pub struct EscrowAccountState {
    pub is_initialized: bool,
    pub hash: String,
    pub creator: String,
    pub sending_asset_account: String,
    pub receiving_asset_account: String,
    pub partner: String,
    pub partner_asset: String,
    pub partner_asset_amount: u64,
}

impl Sealed for EscrowAccountState {}

impl IsInitialized for EscrowAccountState {
    fn is_initialized(&self) -> bool {
        return self.is_initialized
    }
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct PartnerAccountState {
    pub is_initialized: bool,
    pub hash: String,
    pub pubkey: String,
}

impl Sealed for PartnerAccountState {}

impl IsInitialized for PartnerAccountState {
    fn is_initialized(&self) -> bool {
        return self.is_initialized
    }
}
