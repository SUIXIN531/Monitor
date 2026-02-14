export interface MarketPrice {
  price: number;
  lastUpdated: number;
}

export interface FutureMarketData extends MarketPrice {
  markPrice: number;
  fundingRate: number;
  nextFundingTime: number;
}

export interface BorrowData {
  dailyInterestRate: number;
  yearlyInterestRate: number;
  borrowLimit: number;
  isBorrowable: boolean;
}

export interface CoinData {
  symbol: string; // e.g., 'BTC'
  spot: MarketPrice | null;
  uMargined: FutureMarketData | null; // BTCUSDT Perpetual
  coinMargined: FutureMarketData | null; // BTCUSD_PERP
  borrow?: BorrowData | null;
}

export interface ArbAnalysis {
  symbol: string;
  recommendation: string;
  strategy: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  estimatedYield: string;
}

export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}