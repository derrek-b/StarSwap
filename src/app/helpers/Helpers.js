import config from '../config.json'

// Returns asset name from address
export function GetAssetName(address, connection) {
  if (connection.connection.rpcEndpoint === 'http://127.0.0.1:8899') {
    switch (address) {
      case config['localhost'].atlasMint: return 'Atlas'
      case config['localhost'].polisMint: return 'Polis'

      case config['localhost'].foodMint: return 'Food'
      case config['localhost'].fuelMint: return 'Fuel'
    }

  }
  switch (address) {
    case process.env.NEXT_PUBLIC_ATLAS_MINT: return 'Atlas'
    case process.env.NEXT_PUBLIC_POLIS_MINT: return 'Polis'

    case process.env.NEXT_PUBLIC_AMMO_MINT: return 'Ammo'
    case process.env.NEXT_PUBLIC_FOOD_MINT: return 'Food'
    case process.env.NEXT_PUBLIC_FUEL_MINT: return 'Fuel'
    case process.env.NEXT_PUBLIC_TOOLKITS_MINT: return 'Toolkits'
  }
}
