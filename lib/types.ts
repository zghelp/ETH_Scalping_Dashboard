export interface CandleData {
    timestamp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
    // New Indicators
    EMA5?: number | null
    EMA10?: number | null
    BB_Upper?: number | null
    BB_Middle?: number | null
    BB_Lower?: number | null
    BB_Width?: number | null
    Stoch_K?: number | null
    Stoch_D?: number | null
    VMA20?: number | null
    VWAP?: number | null
    ATR14?: number | null
    // For Holdability Score
    EMA15?: number | null // From 15m data
    BTC_close?: number | null // Keep this for sync check
    ETH_close?: number | null // Added in API route for sync check
  }
  
  export interface SignalResult {
    score: number
    reasons: string[]
    types: string[]  // 信号类型分类（可选）
  }

  // Structure for Holdability Score details
  export interface ScoreDetail {
    condition: string;
    met: boolean;
    score: number;
  }

  // Structure for Position Info from API response
  export interface PositionInfoFromAPI {
      side: 'long' | 'short';
      entryPrice: number;
      liquidationPrice: number | null;
  }

  // Updated Props for the frontend component
  export interface SignalProps {
    // Core Info
    time?: number | null;
    price?: number | null;

    // Opening Signal Info (Nested Object)
    opening_signal?: {
        long_score: number;
        long_reasons?: string[];
        long_signalTypes?: string[];
        long_details?: ScoreDetail[]; // Add details field
        short_score: number;
        short_reasons?: string[];
        short_signalTypes?: string[];
        short_details?: ScoreDetail[]; // Add details field
        ema15m_trend?: 'up' | 'down' | 'flat';
    } | null;

    // Holdability Score Info (Conditional)
    holdability_score?: number | null;
    holdability_details?: ScoreDetail[] | null;

    // Position Info (Conditional)
    position?: PositionInfoFromAPI | null;

    // Key Indicators for Display
    indicators_1m?: {
        [key: string]: number | null | string; // Allow flexible display
        ema5: number | null;
        ema10: number | null;
        bb_upper: number | null;
        bb_middle: number | null;
        bb_lower: number | null;
        stoch_k: number | null;
        stoch_d: number | null;
        vwap: number | null;
        atr14: number | null;
        volume: number | null;
        vma20: number | null;
    } | null;
    indicators_15m?: {
        ema15: number | null;
    } | null;

    // Loading and Error States
    isLoading?: boolean;
    error?: any;

    // Recommendation (Keep if still used)
    recommendation?: string;
    recommendationReasons?: string[];

    // Remove old direct props if now nested or obsolete
    // take_profit?: number; (Removed, handled by external bot/manual)
    // stop_loss?: number; (Removed, handled by external bot/manual)
    // long_score?: number; (Now in opening_signal)
    // short_score?: number; (Now in opening_signal)
  }
