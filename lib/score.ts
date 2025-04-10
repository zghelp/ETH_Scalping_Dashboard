import { CandleData, ScoreDetail } from './types'; // Import ScoreDetail type

// Define structure for the function's return value
interface OpeningSignalResult {
    score: number;
    reasons: string[]; // Keep reasons for high-level summary if needed
    types: string[];
    details: ScoreDetail[]; // Add detailed breakdown
}

// Renamed function to reflect its purpose for opening signals
export function scoreSignals(data: CandleData[], direction: 'long' | 'short'): OpeningSignalResult {
    const details: ScoreDetail[] = [];
    let score = 0;
    const reasons: string[] = [];
    const types: string[] = [];

    if (data.length < 2) {
        details.push({ condition: '数据不足', met: false, score: 0 });
        return { score: 0, reasons: ['Insufficient data'], types: [], details };
    }

    const latest = data[data.length - 1];
    const prev = data[data.length - 2];

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
    let emaMet = false;
    let emaScore = 0;
    const emaReason = direction === 'long' ? 'EMA5 > EMA10 (短期看涨)' : 'EMA5 < EMA10 (短期看跌)';
    if (ema5 !== null && ema10 !== null) {
        if (direction === 'long' && ema5 > ema10) emaMet = true;
        if (direction === 'short' && ema5 < ema10) emaMet = true;
    }
    if (emaMet) {
        emaScore = 2;
        score += emaScore;
        reasons.push(emaReason);
        types.push('Trend');
    }
    details.push({ condition: emaReason, met: emaMet, score: emaScore });


    // 2. Bollinger Band Breakout/Touch (+2)
    let bbMet = false;
    let bbScore = 0;
    const bbReason = direction === 'long' ? '价格突破布林带上轨' : '价格跌破布林带下轨';
     if (bbUpper !== null && bbLower !== null && bbMiddle !== null) {
         if (direction === 'long' && latest.close > bbUpper) bbMet = true;
         if (direction === 'short' && latest.close < bbLower) bbMet = true;
    }
    if (bbMet) {
        bbScore = 2;
        score += bbScore;
        reasons.push(bbReason);
        types.push('Breakout');
    }
    details.push({ condition: bbReason, met: bbMet, score: bbScore });


    // 3. Stochastic Momentum (+2)
    let stochMet = false;
    let stochScore = 0;
    const stochReason = direction === 'long' ? 'Stoch %K 上穿 %D (动能增强)' : 'Stoch %K 下穿 %D (动能减弱)';
    if (stochK !== null && stochD !== null && prev.Stoch_K !== null && prev.Stoch_D !== null) {
        const kCrossedDUp = prev.Stoch_K <= prev.Stoch_D && stochK > stochD;
        const kCrossedDDown = prev.Stoch_K >= prev.Stoch_D && stochK < stochD;

        if (direction === 'long' && kCrossedDUp && stochK < 70) stochMet = true;
        if (direction === 'short' && kCrossedDDown && stochK > 30) stochMet = true;
    }
     if (stochMet) {
        stochScore = 2;
        score += stochScore;
        reasons.push(stochReason);
        types.push('Momentum');
    }
    details.push({ condition: stochReason, met: stochMet, score: stochScore });


    // 4. Volume Confirmation (+1)
    let volMet = false;
    let volScore = 0;
    const volReason = '成交量放大 ( > VMA20 * 1.5)';
    if (vma20 !== null && volume > vma20 * 1.5) {
        volMet = true;
        volScore = 1;
        score += volScore;
        reasons.push(volReason);
        types.push('Confirmation');
    }
    details.push({ condition: volReason, met: volMet, score: volScore });


    // 5. VWAP Confirmation (+1)
    let vwapMet = false;
    let vwapScore = 0;
    const vwapReason = direction === 'long' ? '价格 > VWAP (日内偏多)' : '价格 < VWAP (日内偏空)';
     if (vwap !== null) {
        if (direction === 'long' && latest.close > vwap) vwapMet = true;
        if (direction === 'short' && latest.close < vwap) vwapMet = true;
    }
    if (vwapMet) {
        vwapScore = 1;
        score += vwapScore;
        reasons.push(vwapReason);
        types.push('Confirmation');
    }
    details.push({ condition: vwapReason, met: vwapMet, score: vwapScore });


    // 6. 15m EMA Trend Alignment (+1)
    let trendMet = false;
    let trendScore = 0;
    const trendReason = direction === 'long' ? '与 15m EMA 趋势同向 (涨)' : '与 15m EMA 趋势同向 (跌)';
    if (direction === 'long' && ema15Trend === 'up') trendMet = true;
    if (direction === 'short' && ema15Trend === 'down') trendMet = true;
    if (trendMet) {
        trendScore = 1;
        score += trendScore;
        reasons.push(trendReason);
        types.push('TrendFilter');
    }
    details.push({ condition: trendReason, met: trendMet, score: trendScore });


    // 7. BTC Sync Confirmation (+1)
    let btcSyncMet = false;
    let btcSyncScore = 0;
    const btcSyncReason = direction === 'long' ? 'BTC 同步上涨' : 'BTC 同步下跌';
    if (btcClose !== null && prevBtcClose !== null) {
        const ethDirectionUp = latest.close > prev.close;
        const btcDirectionUp = btcClose > prevBtcClose;
        if (direction === 'long' && ethDirectionUp && btcDirectionUp) btcSyncMet = true;
        if (direction === 'short' && !ethDirectionUp && !btcDirectionUp) btcSyncMet = true;
    }
    if (btcSyncMet) {
        btcSyncScore = 1;
        score += btcSyncScore;
        reasons.push(btcSyncReason);
        types.push('Confirmation');
    }
    details.push({ condition: btcSyncReason, met: btcSyncMet, score: btcSyncScore });


    // Max score could be 2+2+2+1+1+1+1 = 10

    return { score, reasons, types, details };
}
