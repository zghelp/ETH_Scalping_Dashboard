import { CandleData } from './types'; // Ensure CandleData includes all new indicators + EMA15_Trend

// Renamed function to reflect its purpose for opening signals
export function scoreSignals(data: CandleData[], direction: 'long' | 'short'): { score: number; reasons: string[]; types: string[] } {
    if (data.length < 2) {
        return { score: 0, reasons: ['Insufficient data'], types: [] };
    }

    const latest = data[data.length - 1];
    const prev = data[data.length - 2];
    const reasons: string[] = [];
    const types: string[] = []; // Can categorize signals (e.g., 'Trend', 'Momentum', 'Breakout')
    let score = 0;

    // --- Indicator Values (handle nulls) ---
    const ema5 = latest.EMA5 ?? null;
    const ema10 = latest.EMA10 ?? null;
    const bbUpper = latest.BB_Upper ?? null;
    const bbLower = latest.BB_Lower ?? null;
    const bbMiddle = latest.BB_Middle ?? null;
    const stochK = latest.Stoch_K ?? null;
    const stochD = latest.Stoch_D ?? null;
    const vma20 = latest.VMA20 ?? null;
    const volume = latest.volume;
    const vwap = latest.VWAP ?? null;
    const atr = latest.ATR14 ?? 0; // Use 0 if ATR is null
    const ema15Trend = (latest as any).EMA15_Trend ?? 'flat'; // Trend added in API route
    const btcClose = latest.BTC_close ?? null;
    const prevBtcClose = prev.BTC_close ?? null;

    // --- Scoring Logic for Opening Signals ---

    // 1. Fast EMA Trend (+2)
    if (ema5 !== null && ema10 !== null) {
        if (direction === 'long' && ema5 > ema10) {
            reasons.push('EMA5 > EMA10 (短期看涨)');
            types.push('Trend');
            score += 2;
        } else if (direction === 'short' && ema5 < ema10) {
            reasons.push('EMA5 < EMA10 (短期看跌)');
            types.push('Trend');
            score += 2;
        }
    }

    // 2. Bollinger Band Breakout/Touch (+2)
    if (bbUpper !== null && bbLower !== null && bbMiddle !== null) {
         if (direction === 'long' && latest.close > bbUpper) {
            reasons.push('价格突破布林带上轨');
            types.push('Breakout');
            score += 2;
        } else if (direction === 'short' && latest.close < bbLower) {
            reasons.push('价格跌破布林带下轨');
            types.push('Breakout');
            score += 2;
        }
        // Optional: Add points for touching bands in strong trends?
        // else if (direction === 'long' && latest.close >= bbMiddle && latest.low <= bbLower + 0.2 * atr) { ... } // Bounce off lower band in uptrend?
    }

    // 3. Stochastic Momentum (+2)
    if (stochK !== null && stochD !== null) {
        const kCrossedDUp = prev.Stoch_K !== null && prev.Stoch_K <= prev.Stoch_D! && stochK > stochD;
        const kCrossedDDown = prev.Stoch_K !== null && prev.Stoch_K >= prev.Stoch_D! && stochK < stochD;

        if (direction === 'long' && kCrossedDUp && stochK < 70) { // Cross up, not too overbought
            reasons.push('Stoch %K 上穿 %D (动能增强)');
            types.push('Momentum');
            score += 2;
        } else if (direction === 'short' && kCrossedDDown && stochK > 30) { // Cross down, not too oversold
            reasons.push('Stoch %K 下穿 %D (动能减弱)');
            types.push('Momentum');
            score += 2;
        }
    }

    // 4. Volume Confirmation (+1)
    if (vma20 !== null && volume > vma20 * 1.5) {
        reasons.push('成交量放大 ( > VMA20 * 1.5)');
        types.push('Confirmation');
        score += 1;
    }

    // 5. VWAP Confirmation (+1) - Price relative to VWAP
     if (vwap !== null) {
        if (direction === 'long' && latest.close > vwap) {
            reasons.push('价格 > VWAP (日内偏多)');
            types.push('Confirmation');
            score += 1;
        } else if (direction === 'short' && latest.close < vwap) {
            reasons.push('价格 < VWAP (日内偏空)');
            types.push('Confirmation');
            score += 1;
        }
    }

    // 6. 15m EMA Trend Alignment (+1) - As discussed (Option 2)
    if (direction === 'long' && ema15Trend === 'up') {
        reasons.push('与 15m EMA 趋势同向 (涨)');
        types.push('TrendFilter');
        score += 1;
    } else if (direction === 'short' && ema15Trend === 'down') {
        reasons.push('与 15m EMA 趋势同向 (跌)');
        types.push('TrendFilter');
        score += 1;
    }

    // 7. BTC Sync Confirmation (+1)
    if (btcClose !== null && prevBtcClose !== null) {
        const ethDirectionUp = latest.close > prev.close;
        const btcDirectionUp = btcClose > prevBtcClose;
        if (direction === 'long' && ethDirectionUp && btcDirectionUp) {
            reasons.push('BTC 同步上涨');
            types.push('Confirmation');
            score += 1;
        } else if (direction === 'short' && !ethDirectionUp && !btcDirectionUp) {
            reasons.push('BTC 同步下跌');
            types.push('Confirmation');
            score += 1;
        }
    }

    // Max score could be 2+2+2+1+1+1+1 = 10

    return { score, reasons, types };
}
