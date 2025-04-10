import { CandleData } from './types'; // Assuming CandleData includes new indicators or use a more specific type

// Define expected structure for position data from Gate.io API
interface PositionInfo {
    side: 'long' | 'short';
    entryPrice: number;
    liquidationPrice: number | null; // Liquidation price might be null if no position or other reasons
}

// Define structure for the score details
interface ScoreDetail {
    condition: string;
    met: boolean;
    score: number;
}

// Helper to calculate SMA for ATR MA
const sma = (arr: (number | null)[], period: number): number | null => {
    const validArr = arr.filter(v => v !== null) as number[];
    if (period <= 0 || validArr.length < period) {
        return null;
    }
    // Get the last 'period' valid numbers
    const slice = validArr.slice(-period);
     if (slice.length < period) {
        return null; // Not enough data points even after filtering nulls
    }
    return slice.reduce((a, b) => a + b, 0) / period;
};


export function calculateHoldabilityScore(
    data: CandleData[], // 1m data with all indicators calculated
    position: PositionInfo | null, // Current position details, null if no position
    btcData: CandleData[], // Last 2 candles of 1m BTC data
    ema15mData: CandleData[] // Last 2 candles of 15m ETH data with EMA15 calculated
): { score: number; details: ScoreDetail[] } {

    const details: ScoreDetail[] = [];
    let totalScore = 0;

    // Default score if no position or insufficient data
    if (!position || data.length < 2 || btcData.length < 2 || ema15mData.length < 2) {
        // Return default score details indicating why scoring wasn't possible
         details.push({ condition: '持仓或数据不足', met: false, score: 0 });
         return { score: 0, details };
    }

    const latest = data[data.length - 1];
    const prev = data[data.length - 2];
    const latest15m = ema15mData[ema15mData.length - 1];
    // Assume EMA15 is calculated and added to ema15mData objects in the API route
    const ema15 = latest15m.EMA15 ?? null; // Need to ensure EMA15 is calculated and added

    const currentPrice = latest.close;
    const currentATR = latest.ATR14 ?? 0; // Use 0 if null

    // --- Scoring Logic ---

    // 1. Structure (+2) - Based on 15m EMA
    let structureMet = false;
    if (ema15 !== null) {
        if (position.side === 'long' && currentPrice > ema15) {
            structureMet = true;
        } else if (position.side === 'short' && currentPrice < ema15) {
            structureMet = true;
        }
    }
    const structureScore = structureMet ? 2 : 0;
    totalScore += structureScore;
    details.push({ condition: '结构未破坏 (vs 15m EMA)', met: structureMet, score: structureScore });

    // 2. No Bad Bar (+2) - Check last opposing bar
    let noBadBarMet = true; // Assume true unless proven otherwise
    const lastBarDirection = latest.close > latest.open ? 'long' : 'short';
    if (lastBarDirection !== position.side) { // Check only if the last bar was opposing
        const lastBarVolume = latest.volume;
        const vma20 = latest.VMA20 ?? Infinity; // Treat null VMA as very high to fail the volume check safely
        const lastBarBody = Math.abs(latest.close - latest.open);
        const atrThreshold = 1.0 * currentATR;
        const volumeThreshold = (latest.VMA20 ?? 0) * 1.5; // Use VMA20 if available

        if (lastBarVolume > volumeThreshold && lastBarBody > atrThreshold) {
            noBadBarMet = false; // It was a bad bar (high volume AND large body)
        }
    }
    const noBadBarScore = noBadBarMet ? 2 : 0;
    totalScore += noBadBarScore;
    details.push({ condition: '无放量剧烈反向K线', met: noBadBarMet, score: noBadBarScore });

    // 3. Ranging (+1) - Based on ATR vs ATR MA(20)
    let rangingMet = false;
    const atrHistory = data.slice(-20).map(d => d.ATR14); // Get last 20 ATRs
    const atrMA20 = sma(atrHistory, 20);
    if (atrMA20 !== null && currentATR < atrMA20) {
        rangingMet = true;
    }
    const rangingScore = rangingMet ? 1 : 0;
    totalScore += rangingScore;
    details.push({ condition: '当前为震荡行情阶段 (ATR < ATR MA20)', met: rangingMet, score: rangingScore });

    // 4. Entry Location (+2) - Based on BBands and ATR
    let locationMet = false;
    const bbLower = latest.BB_Lower ?? -Infinity;
    const bbUpper = latest.BB_Upper ?? Infinity;
    const entryPrice = position.entryPrice;
    const atrOffset = 0.5 * currentATR;

    if (position.side === 'long' && entryPrice < (bbLower + atrOffset)) {
        locationMet = true;
    } else if (position.side === 'short' && entryPrice > (bbUpper - atrOffset)) {
        locationMet = true;
    }
    const locationScore = locationMet ? 2 : 0;
    totalScore += locationScore;
    details.push({ condition: '开仓靠近支撑/阻力 (BBands ± 0.5*ATR)', met: locationMet, score: locationScore });


    // 5. Liq Distance (+1)
    let liqDistMet = false;
    if (position.liquidationPrice !== null) {
        if (Math.abs(currentPrice - position.liquidationPrice) >= 300) {
            liqDistMet = true;
        }
    }
    const liqDistScore = liqDistMet ? 1 : 0;
    totalScore += liqDistScore;
    details.push({ condition: '强平价距离远 (≥ $300)', met: liqDistMet, score: liqDistScore });

    // 6. BTC Sync (+1)
    let btcSyncMet = false;
    const latestBtc = btcData[btcData.length - 1];
    const prevBtc = btcData[btcData.length - 2];
    const ethDirection = latest.close > prev.close; // True for up, False for down
    const btcDirection = latestBtc.close > prevBtc.close; // True for up, False for down
    if (ethDirection === btcDirection) {
        btcSyncMet = true;
    }
    const btcSyncScore = btcSyncMet ? 1 : 0;
    totalScore += btcSyncScore;
    details.push({ condition: 'ETH 与 BTC 同方向运动 (Last Bar)', met: btcSyncMet, score: btcSyncScore });


    return { score: totalScore, details };
}
