import { CandleData } from './types'; // Assuming CandleData type exists

// Helper function for Simple Moving Average (SMA)
const sma = (arr: number[], period: number): (number | null)[] => {
  if (period <= 0 || arr.length < period) {
    return Array(arr.length).fill(null);
  }
  const result: (number | null)[] = Array(period - 1).fill(null);
  let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
  result.push(sum / period);
  for (let i = period; i < arr.length; i++) {
    sum = sum - arr[i - period] + arr[i];
    result.push(sum / period);
  }
  return result;
};

// Helper function for Standard Deviation
const stdDev = (arr: number[], period: number): (number | null)[] => {
    if (period <= 0 || arr.length < period) {
        return Array(arr.length).fill(null);
    }
    const result: (number | null)[] = Array(period - 1).fill(null);
    for (let i = period - 1; i < arr.length; i++) {
        const slice = arr.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
        result.push(Math.sqrt(variance));
    }
    return result;
};


// Helper function for Exponential Moving Average (EMA)
const ema = (arr: number[], period: number): (number | null)[] => {
  if (period <= 0 || arr.length === 0) return Array(arr.length).fill(null);
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let currentEma: number | null = null;

  for (let i = 0; i < arr.length; i++) {
    if (i < period -1) {
        result.push(null); // Not enough data yet
    } else if (i === period - 1) {
        // Calculate initial SMA for the first EMA value
        const initialSlice = arr.slice(0, period);
        currentEma = initialSlice.reduce((a, b) => a + b, 0) / period;
        result.push(currentEma);
    } else {
        if (currentEma !== null) {
            currentEma = arr[i] * k + currentEma * (1 - k);
            result.push(currentEma);
        } else {
             result.push(null); // Should not happen if logic is correct
        }
    }
  }
  return result;
};

// Helper function for True Range (TR)
const calculateTR = (data: CandleData[]): number[] => {
    const tr: number[] = [];
    if (data.length === 0) return tr;
    tr.push(data[0].high - data[0].low); // First TR
    for (let i = 1; i < data.length; i++) {
        const highLow = data[i].high - data[i].low;
        const highPrevClose = Math.abs(data[i].high - data[i-1].close);
        const lowPrevClose = Math.abs(data[i].low - data[i-1].close);
        tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
    }
    return tr;
};

// Helper function for Average True Range (ATR) using Wilder's Smoothing
const calculateATR = (tr: number[], period: number): (number | null)[] => {
    if (period <= 0 || tr.length < period) {
        return Array(tr.length).fill(null);
    }
    const atr: (number | null)[] = Array(period - 1).fill(null);
    let sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
    let currentATR = sum / period;
    atr.push(currentATR);

    for (let i = period; i < tr.length; i++) {
        currentATR = (currentATR * (period - 1) + tr[i]) / period;
        atr.push(currentATR);
    }
    return atr;
};


export function calculateIndicators(data: CandleData[]) {
  if (!data || data.length === 0) return [];

  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);

  // --- Calculate Indicators ---
  const ema5 = ema(closes, 5);
  const ema10 = ema(closes, 10);

  // Bollinger Bands (20, 2)
  const bbPeriod = 20;
  const bbStdDevMultiplier = 2;
  const sma20 = sma(closes, bbPeriod);
  const stdDev20 = stdDev(closes, bbPeriod);
  const bbUpper = sma20.map((smaVal, i) => smaVal !== null && stdDev20[i] !== null ? smaVal + bbStdDevMultiplier * stdDev20[i]! : null);
  const bbMiddle = sma20;
  const bbLower = sma20.map((smaVal, i) => smaVal !== null && stdDev20[i] !== null ? smaVal - bbStdDevMultiplier * stdDev20[i]! : null);
  const bbWidth = bbUpper.map((upper, i) => upper !== null && bbLower[i] !== null ? upper - bbLower[i]! : null);


  // Stochastic Oscillator (8, 3, 3) - Slow version
  const stochPeriod = 8;
  const stochKSmooth = 3;
  const stochDSmooth = 3;
  const rawK: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
      if (i < stochPeriod - 1) {
          rawK.push(null);
          continue;
      }
      const lookbackHighs = highs.slice(i - stochPeriod + 1, i + 1);
      const lookbackLows = lows.slice(i - stochPeriod + 1, i + 1);
      const highestHigh = Math.max(...lookbackHighs);
      const lowestLow = Math.min(...lookbackLows);
      const currentClose = closes[i];
      if (highestHigh === lowestLow) {
          rawK.push(i > 0 && rawK[i-1] !== null ? rawK[i-1] : 50); // Avoid division by zero, carry forward or default to 50
      } else {
          rawK.push(((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100);
      }
  }
  const stochK = sma(rawK.filter(k => k !== null) as number[], stochKSmooth); // Slow %K
  // Pad stochK with nulls at the beginning to match original length
  const paddedStochK = Array(data.length - stochK.length).fill(null).concat(stochK);
  const stochD = sma(stochK.filter(k => k !== null) as number[], stochDSmooth); // %D
  // Pad stochD
  const paddedStochD = Array(data.length - stochD.length).fill(null).concat(stochD);


  // Volume Moving Average (20)
  const vma20 = sma(volumes, 20);

  // VWAP (Approximate, rolling over the provided data length)
  const vwap: (number | null)[] = [];
  let cumulativeVolume = 0;
  let cumulativePV = 0;
  for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      const volume = data[i].volume;
      cumulativeVolume += volume;
      cumulativePV += typicalPrice * volume;
      if (cumulativeVolume > 0) {
          vwap.push(cumulativePV / cumulativeVolume);
      } else {
          vwap.push(null); // Avoid division by zero if volume is 0
      }
  }


  // ATR (14)
  const atrPeriod = 14;
  const tr = calculateTR(data);
  const atr14 = calculateATR(tr, atrPeriod);


  // --- Combine Results ---
  return data.map((d, i) => ({
    ...d,
    EMA5: ema5[i] ?? null,
    EMA10: ema10[i] ?? null,
    BB_Upper: bbUpper[i] ?? null,
    BB_Middle: bbMiddle[i] ?? null,
    BB_Lower: bbLower[i] ?? null,
    BB_Width: bbWidth[i] ?? null,
    Stoch_K: paddedStochK[i] ?? null,
    Stoch_D: paddedStochD[i] ?? null,
    VMA20: vma20[i] ?? null,
    VWAP: vwap[i] ?? null,
    ATR14: atr14[i] ?? null,
    // Remove old indicators if they exist in d (like EMA20, RSI)
    EMA20: undefined,
    RSI: undefined,
  }));
}

// Helper to ensure CandleData type includes new indicators (optional but good practice)
// You might want to update lib/types.ts accordingly
// export interface CandleDataWithIndicators extends CandleData {
//   EMA5: number | null;
//   EMA10: number | null;
//   BB_Upper: number | null;
//   BB_Middle: number | null;
//   BB_Lower: number | null;
//   BB_Width: number | null;
//   Stoch_K: number | null;
//   Stoch_D: number | null;
//   VMA20: number | null;
//   VWAP: number | null;
//   ATR14: number | null;
// }
