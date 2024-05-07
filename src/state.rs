use borsh::{BorshSerialize, BorshDeserialize};

#[derive(BorshSerialize, BorshDeserialize)]
pub struct TradeAccountState{
    pub is_active: bool,
    pub trader1: String,
    pub asset1: String,
    pub asset1_amount: u32,
    pub trader2: String,
    pub asset2: String,
    pub asset2_amount: u32,
}
