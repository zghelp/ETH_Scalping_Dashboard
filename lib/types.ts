export interface CandleData {
    timestamp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
    EMA5?: number
    EMA20?: number
    RSI?: number
    BTC_close?: number
  }
  
  export interface SignalResult {
    score: number
    reasons: string[]
    types: string[]  // 信号类型分类（可选）
  }
  
  export interface SignalProps {
    time: number
    price: number
    take_profit: number
    stop_loss: number
  
    long_score: number
    long_signalTypes?: string[]
    long_reasons?: string[]
  
    short_score: number
    short_signalTypes?: string[]
    short_reasons?: string[]
  
    recommendation?: string
    recommendationReasons?: string[]
  
    isLoading?: boolean
    error?: any
  }
  