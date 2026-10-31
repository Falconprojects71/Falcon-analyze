import { AssetCategoryName, AssetInstrument, SampleChart } from '../types';

export const ASSET_CATEGORIES: AssetCategoryName[] = [
  'Crypto',
  'Forex',
  'Commodities',
  'Energies',
  'Stocks',
  'Indices',
];

export const ASSET_INSTRUMENTS_BY_CATEGORY: Record<AssetCategoryName, AssetInstrument[]> = {
  Crypto: [
    { id: 'btc', name: 'BTCUSD', category: 'Crypto', description: 'Bitcoin / US Dollar' },
    { id: 'eth', name: 'ETHUSD', category: 'Crypto', description: 'Ethereum / US Dollar' },
    { id: 'sol', name: 'SOLUSD', category: 'Crypto', description: 'Solana / US Dollar' },
    { id: 'xrp', name: 'XRPUSD', category: 'Crypto', description: 'Ripple / US Dollar' },
    { id: 'bnb', name: 'BNBUSD', category: 'Crypto', description: 'Binance Coin / US Dollar' },
  ],
  Forex: [
    { id: 'eurusd', name: 'EURUSD', category: 'Forex', description: 'Euro / US Dollar' },
    { id: 'gbpusd', name: 'GBPUSD', category: 'Forex', description: 'British Pound / US Dollar' },
    { id: 'usdjpy', name: 'USDJPY', category: 'Forex', description: 'US Dollar / Japanese Yen' },
    { id: 'audusd', name: 'AUDUSD', category: 'Forex', description: 'Australian Dollar / US Dollar' },
    { id: 'usdcad', name: 'USDCAD', category: 'Forex', description: 'US Dollar / Canadian Dollar' },
  ],
  Commodities: [
    { id: 'gold', name: 'XAUUSD', category: 'Commodities', description: 'Gold / US Dollar' },
    { id: 'silver', name: 'XAGUSD', category: 'Commodities', description: 'Silver / US Dollar' },
    { id: 'copper', name: 'COPPER', category: 'Commodities', description: 'High Grade Copper' },
    { id: 'platinum', name: 'PLATINUM', category: 'Commodities', description: 'Platinum Spot' },
  ],
  Energies: [
    { id: 'oil', name: 'WTIUSD', category: 'Energies', description: 'Crude Oil WTI' },
    { id: 'brent', name: 'BRENT', category: 'Energies', description: 'Brent Crude Oil' },
    { id: 'gas', name: 'NATGAS', category: 'Energies', description: 'Natural Gas' },
  ],
  Stocks: [
    { id: 'nvda', name: 'NVDA', category: 'Stocks', description: 'NVIDIA Corp' },
    { id: 'aapl', name: 'AAPL', category: 'Stocks', description: 'Apple Inc' },
    { id: 'tsla', name: 'TSLA', category: 'Stocks', description: 'Tesla Inc' },
    { id: 'msft', name: 'MSFT', category: 'Stocks', description: 'Microsoft Corp' },
    { id: 'amzn', name: 'AMZN', category: 'Stocks', description: 'Amazon.com Inc' },
  ],
  Indices: [
    { id: 'us500', name: 'US500', category: 'Indices', description: 'S&P 500 Index' },
    { id: 'nas100', name: 'US100', category: 'Indices', description: 'Nasdaq 100 Index' },
    { id: 'us30', name: 'US30', category: 'Indices', description: 'Dow Jones Industrial Average' },
    { id: 'dax', name: 'GER40', category: 'Indices', description: 'Germany DAX 40' },
  ],
};

export const SAMPLE_CHARTS: SampleChart[] = [
  {
    id: 'gold_15m',
    name: 'XAUUSD (Gold) Scalp',
    asset: 'XAUUSD',
    timeframe: '15m',
    tradingStyle: 'Scalping',
    description: 'Gold 15m intraday liquidity sweep & demand zone breakout.',
    imageUrl: '',
  },
  {
    id: 'btc_4h',
    name: 'BTCUSD Swing Structure',
    asset: 'BTCUSD',
    timeframe: '4H',
    tradingStyle: 'Swing',
    description: 'Bitcoin 4H bullish market structure shift with FVG confluence.',
    imageUrl: '',
  },
];
