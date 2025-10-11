// W-Swap Liquidity Pool configuration
// All LP addresses for the WCO/WAVE trading pairs

export interface LPConfig {
  address: string;
  pair: string;
  token0: string;
  token1: string;
  label: string;
  isWavePair: boolean;
}

export const WSWAP_LPS: LPConfig[] = [
  {
    address: "0xC61856cdf226645eaB487352C031Ec4341993F87",
    pair: "OG88/WCO",
    token0: "OG88",
    token1: "WCO",
    label: "OG88-WCO LP",
    isWavePair: false
  },
  {
    address: "0xD4e9176d5189dbb24F40e5c6c45bb1682dCb3324",
    pair: "WCO/USDT",
    token0: "WCO",
    token1: "USDT",
    label: "WCO-USDT LP",
    isWavePair: false
  },
  {
    address: "0x00d91Ce419C068E36928FD8E9379B11D0011F052",
    pair: "WCO/USDC",
    token0: "WCO",
    token1: "USDC",
    label: "WCO-USDC LP",
    isWavePair: false
  },
  {
    address: "0xB27dB8d18DF76c037EFa98BCED9F3ea89c73c813",
    pair: "WCO/MEME17",
    token0: "WCO",
    token1: "MEME17",
    label: "WCO-MEME17 LP",
    isWavePair: false
  }
];

export const MAIN_TOKEN = "WCO";
export const REFRESH_INTERVAL = 5000; // 5 seconds
export const WCHAIN_SCAN_API = "https://scan.w-chain.com/api";
