use borsh::{BorshSerialize, BorshDeserialize};

#[derive(BorshSerialize, BorshDeserialize)]
pub struct TradeAccountState {
    pub index: u64,
    pub is_creator: bool,
    pub user: String,
    pub user_asset: String,
    pub user_asset_amount: u32,
    pub partner: String,
    pub partner_asset: String,
    pub partner_asset_amount: u32,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct TradeIndexState {
    pub index: u64,
}
