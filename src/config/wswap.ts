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
    address: "0x35264F0E8cD7A32341f47dBFBf2d85b81fd0ef0A",
    pair: "WCO/WAVE",
    token0: "WCO",
    token1: "WAVE",
    label: "WCO-WAVE LP #1",
    isWavePair: true
  },
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
  }
];

export const MAIN_TOKEN = "WCO";
export const REFRESH_INTERVAL = 5000; // 5 seconds
export const WCHAIN_SCAN_API = "https://scan.w-chain.com/api";
