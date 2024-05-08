// Returns asset name from address
export function GetAssetName(address) {
  switch (address) {
    case process.env.NEXT_PUBLIC_ATLAS_MINT: return 'Atlas'
    case process.env.NEXT_PUBLIC_POLIS_MINT: return 'Polis'
    case process.env.NEXT_PUBLIC_AMMO_MINT: return 'Ammo'
    case process.env.NEXT_PUBLIC_FOOD_MINT: return 'Food'
    case process.env.NEXT_PUBLIC_FUEL_MINT: return 'Fuel'
    case process.env.NEXT_PUBLIC_TOOLKITS_MINT: return 'Toolkits'
  }
}
