import type { NextApiRequest, NextApiResponse } from 'next';
import { FuturesApi, ApiClient } from 'gate-api'; // Corrected import path
import { getLatestKlines } from '@/lib/gateio'; // Keep using this for K-lines
import { calculateIndicators } from '@/lib/indicators';
import { calculateHoldabilityScore } from '@/lib/holdabilityScore';
import { scoreSignals as scoreOpeningSignals } from '@/lib/score'; // Rename import for clarity - **Needs update later**
import { CandleData } from '@/lib/types';

// Initialize Gate.io API Client
const client = new ApiClient(); // Correct initialization using 'new'
// Configure APIv4 key authorization
client.setApiKeySecret(process.env.GATE_READ_API_KEY!, process.env.GATE_READ_API_SECRET!); // Use env vars
const futuresApi = new FuturesApi(client);
const settle = 'usdt'; // Settle currency for perpetual contract
const contract = 'ETH_USDT'; // Contract identifier

// Helper function to calculate EMA (needed for 15m EMA here)
const calculateEma = (arr: number[], period: number): (number | null)[] => {
    if (period <= 0 || arr.length === 0) return Array(arr.length).fill(null);
    const k = 2 / (period + 1);
    const result: (number | null)[] = [];
    let currentEma: number | null = null;
    for (let i = 0; i < arr.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else if (i === period - 1) {
            const initialSlice = arr.slice(0, period);
            currentEma = initialSlice.reduce((a, b) => a + b, 0) / period;
            result.push(currentEma);
        } else {
            if (currentEma !== null) {
                currentEma = arr[i] * k + currentEma * (1 - k);
                result.push(currentEma);
            } else {
                result.push(null);
            }
        }
    }
    return result;
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // 1. Fetch Position Info from Gate.io
        let positionInfo = null;
        try {
            const positionResult = await futuresApi.getPosition(settle, contract);
            const pos = positionResult.body;
            if (pos && pos.size !== 0) { // Check if there is an open position
                 positionInfo = {
                    side: pos.size! > 0 ? 'long' : 'short',
                    entryPrice: parseFloat(pos.entryPrice || '0'),
                    liquidationPrice: parseFloat(pos.liqPrice || '0') || null // Handle potential null/empty string
                 };
            }
        } catch (posError: any) {
            // Handle cases where position doesn't exist (404) or other API errors
            if (posError.status !== 404) {
                 console.error("Gate.io Get Position Error:", posError.message);
                 // Decide if you want to throw or continue without position info
            }
             console.log("No active position found or API error fetching position.");
        }


        // 2. Fetch K-line Data (1m ETH, 1m BTC, 15m ETH)
        const [ethKlines1m, btcKlines1m, ethKlines15m] = await Promise.all([
            getLatestKlines(contract, '1m', 100), // ~100 for indicators
            getLatestKlines('BTC_USDT', '1m', 2),   // Last 2 for sync check
            getLatestKlines(contract, '15m', 20)   // ~20 for EMA15 calculation
        ]);

        // 3. Calculate 1m Indicators for ETH
        const enrichedEth1m: CandleData[] = calculateIndicators(ethKlines1m);

        // 4. Calculate 15m EMA for ETH
        const closes15m = ethKlines15m.map(d => d.close);
        const ema15Values = calculateEma(closes15m, 15); // Calculate EMA15
         // Add EMA15 to the 15m data (needed for holdability score)
        const enrichedEth15m = ethKlines15m.map((candle, index) => ({
            ...candle,
            EMA15: ema15Values[index] ?? null
        }));


        // 5. Ensure we have enough data for scoring
        if (enrichedEth1m.length < 2 || btcKlines1m.length < 2 || enrichedEth15m.length < 2) {
            throw new Error('Insufficient kline data available for processing');
        }

        // 6. Calculate Holdability Score (if position exists)
        const holdabilityResult = calculateHoldabilityScore(
            enrichedEth1m,
            positionInfo,
            btcKlines1m,
            enrichedEth15m // Pass 15m data with EMA15
        );

        // 7. Calculate Opening Signal Score (**PLACEHOLDER - Needs Update**)
        // TODO: Update scoreOpeningSignals in lib/score.ts to use new indicators
        // For now, we might pass the enriched data, but the logic inside is old.
        // We also need to add the 15m EMA trend info if scoreOpeningSignals uses it.
        const latestEth1m = enrichedEth1m[enrichedEth1m.length - 1];
        const latest15mWithEma = enrichedEth15m[enrichedEth15m.length - 1];
        // Add 15m EMA trend to latest 1m data for potential use in opening score
        ;(latestEth1m as any).EMA15_Trend = latest15mWithEma.EMA15 ? (latestEth1m.close > latest15mWithEma.EMA15 ? 'up' : 'down') : 'flat';

        // ** TEMPORARY: Using old scoring logic with potentially incompatible data **
        // This needs to be rewritten in lib/score.ts based on new indicators!
        const longSignal = scoreOpeningSignals(enrichedEth1m, 'long');
        const shortSignal = scoreOpeningSignals(enrichedEth1m, 'short');


        // 8. Prepare Response
        res.status(200).json({
            // Core Info
            time: latestEth1m.timestamp,
            price: latestEth1m.close,

            // Opening Signal (Needs Rework based on new indicators)
            opening_signal: {
                 long_score: longSignal.score,
                 long_reasons: longSignal.reasons,
                 long_signalTypes: longSignal.types,
                 long_details: longSignal.details, // Add details
                 short_score: shortSignal.score,
                 short_reasons: shortSignal.reasons,
                 short_signalTypes: shortSignal.types,
                 short_details: shortSignal.details, // Add details
                 // Add 15m Trend Info
                 ema15m_trend: (latestEth1m as any).EMA15_Trend
            },

            // Holdability Score (if position exists)
            holdability_score: positionInfo ? holdabilityResult.score : null,
            holdability_details: positionInfo ? holdabilityResult.details : [],

             // Current Position Info (if exists)
            position: positionInfo,

            // Key 1m Indicators for Display
            indicators_1m: {
                ema5: latestEth1m.EMA5 ?? null,
                ema10: latestEth1m.EMA10 ?? null,
                bb_upper: latestEth1m.BB_Upper ?? null,
                bb_middle: latestEth1m.BB_Middle ?? null,
                bb_lower: latestEth1m.BB_Lower ?? null,
                stoch_k: latestEth1m.Stoch_K ?? null,
                stoch_d: latestEth1m.Stoch_D ?? null,
                vwap: latestEth1m.VWAP ?? null,
                atr14: latestEth1m.ATR14 ?? null,
                volume: latestEth1m.volume,
                vma20: latestEth1m.VMA20 ?? null,
            },
             // Key 15m Indicator
            indicators_15m: {
                ema15: latest15mWithEma.EMA15 ?? null,
            }

            // Note: Fixed TP/SL removed as per strategy relying on external bot/manual exit
        });

    } catch (err: any) {
        console.error("API Error:", err);
        // Provide more specific error feedback if possible
        let errorMsg = 'Failed to fetch or compute signal';
        if (err.response?.body?.label) { // Check for Gate.io specific error label
            errorMsg = `Gate.io API Error: ${err.response.body.label} - ${err.response.body.message}`;
        } else if (err.message) {
            errorMsg = err.message;
        }
        res.status(500).json({ error: errorMsg, details: err.toString() });
    }
}
