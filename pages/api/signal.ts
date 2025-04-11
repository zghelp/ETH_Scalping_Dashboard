import type { NextApiRequest, NextApiResponse } from 'next';
import { FuturesApi, ApiClient } from 'gate-api';
import axios from 'axios';
import { kv } from '@vercel/kv'; // Import Vercel KV client
import { getLatestKlines } from '@/lib/gateio';
import { calculateIndicators } from '@/lib/indicators';
import { calculateHoldabilityScore } from '@/lib/holdabilityScore';
import { scoreSignals as scoreOpeningSignals } from '@/lib/score';
import { CandleData, SignalProps } from '@/lib/types'; // Import SignalProps for response type

// Initialize Gate.io API Client
const client = new ApiClient();
client.setApiKeySecret(process.env.GATE_READ_API_KEY!, process.env.GATE_READ_API_SECRET!);
const futuresApi = new FuturesApi(client);
const settle = 'usdt';
const contract = 'ETH_USDT';

// Helper function to calculate EMA
const calculateEma = (arr: number[], period: number): (number | null)[] => {
    if (period <= 0 || arr.length < period) return Array(arr.length).fill(null);
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

// Helper function to fetch FNG Index
async function getFngIndex() {
    const url = 'https://api.alternative.me/fng/?limit=1';
    console.log(`Fetching FNG Index from: ${url}`);
    try {
        const response = await axios.get(url);
        console.log("FNG API Response Status:", response.status);
        if (response.data && response.data.data && response.data.data.length > 0) {
            const fngData = response.data.data[0];
            const result = {
                value: parseInt(fngData.value, 10),
                classification: fngData.value_classification,
            };
            console.log("Parsed FNG Data:", result);
            return result;
        } else {
            console.warn("FNG API response structure unexpected:", response.data);
        }
    } catch (error: any) {
        console.error("Error fetching FNG Index:", error.message || error);
        if (error.response) {
             console.error("FNG API Error Response:", error.response.status, error.response.data);
        }
    }
    return { value: null, classification: null };
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // --- Fetch Data Concurrently ---
        const [
            positionResult,
            ethKlines1m,
            btcKlines1m,
            ethKlines15m,
            fngData,
            btcKlines1d
        ] = await Promise.all([
            futuresApi.getPosition(settle, contract).catch(err => err),
            getLatestKlines(contract, '1m', 100),
            getLatestKlines('BTC_USDT', '1m', 2),
            getLatestKlines(contract, '15m', 20),
            getFngIndex(),
            getLatestKlines('BTC_USDT', '1d', 60)
        ]);

        // --- Process Position Info ---
        let positionInfo = null;
        if (!(positionResult instanceof Error) && positionResult.body && positionResult.body.size !== 0) {
            const pos = positionResult.body;
            console.log("Raw Position Data from Gate.io:", JSON.stringify(pos, null, 2));
            positionInfo = {
                side: pos.size! > 0 ? 'long' : 'short',
                entryPrice: parseFloat(pos.entryPrice || '0'),
                liquidationPrice: parseFloat(pos.liqPrice || '0') || null
            };
            console.log("Parsed Position Info:", JSON.stringify(positionInfo, null, 2));
        } else if (positionResult instanceof Error && 'status' in positionResult && positionResult.status !== 404) {
            console.error("Gate.io Get Position Error (Non-404):", positionResult.message);
        } else if (positionResult instanceof Error) {
             console.log("No active position found or API error fetching position:", positionResult.message);
        }

        // --- Calculate Indicators ---
        const enrichedEth1m: CandleData[] = calculateIndicators(ethKlines1m);
        const closes15m = ethKlines15m.map(d => d.close);
        const ema15Values = calculateEma(closes15m, 15);
        const enrichedEth15m = ethKlines15m.map((candle, index) => ({
            ...candle, EMA15: ema15Values[index] ?? null
        }));

        // --- Calculate BTC Daily Trend ---
        let btcDailyTrend: 'up' | 'down' | 'flat' | null = null;
        let btcEma50: number | null = null;
        console.log(`Processing BTC Daily Trend. Found ${btcKlines1d?.length ?? 0} daily candles.`);
        if (btcKlines1d && btcKlines1d.length >= 50) {
            const closes1d = btcKlines1d.map(d => d.close);
            const ema50Values1d = calculateEma(closes1d, 50);
            const latestBtcClose1d = btcKlines1d[btcKlines1d.length - 1]?.close;
            btcEma50 = ema50Values1d[ema50Values1d.length - 1] ?? null;
            console.log(`BTC Daily - Latest Close: ${latestBtcClose1d}, EMA50: ${btcEma50}`);
            if (latestBtcClose1d && btcEma50) {
                btcDailyTrend = latestBtcClose1d > btcEma50 ? 'up' : 'down';
            } else {
                 btcDailyTrend = 'flat';
                 console.log("BTC Daily Trend set to flat due to missing close or EMA50.");
            }
        } else {
             console.log("Not enough BTC daily candles to calculate EMA50 trend.");
        }

        // --- Ensure Data Sufficiency ---
        if (enrichedEth1m.length < 2 || btcKlines1m.length < 2 || enrichedEth15m.length < 2) {
            throw new Error('Insufficient kline data available for processing');
        }

        // --- Calculate Scores ---
        const holdabilityResult = calculateHoldabilityScore(
            enrichedEth1m, positionInfo, btcKlines1m, enrichedEth15m
        );

        const latestEth1m = enrichedEth1m[enrichedEth1m.length - 1];
        const latest15mWithEma = enrichedEth15m[enrichedEth15m.length - 1];
        ;(latestEth1m as any).EMA15_Trend = latest15mWithEma.EMA15 ? (latestEth1m.close > latest15mWithEma.EMA15 ? 'up' : 'down') : 'flat';

        const longSignal = scoreOpeningSignals(enrichedEth1m, 'long');
        const shortSignal = scoreOpeningSignals(enrichedEth1m, 'short');

        // --- Prepare Response Data Object ---
        // Use SignalProps type for structure consistency, omit functions/complex objects if not needed in KV
        const responseData: Omit<SignalProps, 'isLoading' | 'error' | 'recommendation' | 'recommendationReasons'> = {
            time: latestEth1m.timestamp,
            price: latestEth1m.close,
            market_context: {
                fng_value: fngData.value,
                fng_classification: fngData.classification,
                btc_daily_trend: btcDailyTrend,
                btc_daily_ema50: btcEma50
            },
            opening_signal: {
                 long_score: longSignal.score,
                 long_reasons: longSignal.reasons,
                 long_signalTypes: longSignal.types,
                 long_details: longSignal.details,
                 short_score: shortSignal.score,
                 short_reasons: shortSignal.reasons,
                 short_signalTypes: shortSignal.types,
                 short_details: shortSignal.details,
                 ema15m_trend: (latestEth1m as any).EMA15_Trend
            },
            holdability_score: positionInfo ? holdabilityResult.score : null,
            holdability_details: positionInfo ? holdabilityResult.details : [],
            position: positionInfo,
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
            indicators_15m: {
                ema15: latest15mWithEma.EMA15 ?? null,
            }
            // historical_data_1m is removed
        };

        // --- Save data to Vercel KV (Run asynchronously, don't block response) ---
        const currentTimestampMs = responseData.time || Date.now(); // Use candle time if available
        const kvKey = `signal:${currentTimestampMs}`;
        kv.set(kvKey, JSON.stringify(responseData), { ex: 60 * 60 * 24 * 7 }) // Expires in 7 days
          .then(() => console.log(`Saved signal data to KV with key: ${kvKey}`))
          .catch(kvError => console.error("Error saving data to Vercel KV:", kvError));

        // --- Send Response ---
        res.status(200).json(responseData);

    } catch (err: any) {
        console.error("API Error:", err);
        let errorMsg = 'Failed to fetch or compute signal';
        if (err.response?.body?.label) {
            errorMsg = `Gate.io API Error: ${err.response.body.label} - ${err.response.body.message}`;
        } else if (err.message) {
            errorMsg = err.message;
        }
        res.status(500).json({ error: errorMsg, details: err.toString() });
    }
}
