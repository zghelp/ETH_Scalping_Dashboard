import type { NextApiRequest, NextApiResponse } from 'next'
import { getLatestKlines } from '@/lib/gateio'
import { calculateIndicators } from '@/lib/indicators'
import { scoreSignals } from '@/lib/score'

import { CandleData } from '@/lib/types' // Assuming CandleData type exists

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Fetch ETH and BTC klines concurrently
    const [ethKlines, btcKlines] = await Promise.all([
      getLatestKlines('ETH_USDT', '1m', 100),
      getLatestKlines('BTC_USDT', '1m', 2) // Fetch last 2 for BTC
    ])

    // 2. Calculate indicators for ETH
    const enrichedEth: CandleData[] = calculateIndicators(ethKlines) // Use CandleData type if available

    // 3. Ensure we have enough data
    if (enrichedEth.length < 2 || btcKlines.length < 2) {
      throw new Error('Insufficient kline data available')
    }

    // 4. Extract latest and previous close prices
    const latestEth = enrichedEth[enrichedEth.length - 1]
    const prevEth = enrichedEth[enrichedEth.length - 2]
    const latestBtc = btcKlines[btcKlines.length - 1]
    const prevBtc = btcKlines[btcKlines.length - 2]

    // 5. Add BTC/ETH close prices to the relevant ETH data points for scoring
    //    (TypeScript might complain if CandleData doesn't define these optional fields,
    //     but it should work at runtime. Ideally, update CandleData type.)
    ;(latestEth as any).ETH_close = latestEth.close
    ;(latestEth as any).BTC_close = latestBtc.close
    ;(prevEth as any).ETH_close = prevEth.close
    ;(prevEth as any).BTC_close = prevBtc.close

    // 6. Score signals using the modified ETH data
    const longSignal = scoreSignals(enrichedEth, 'long')
    const shortSignal = scoreSignals(enrichedEth, 'short')

    // 7. Prepare response using the latest ETH data
    res.status(200).json({
      time: latestEth.timestamp,
      price: latestEth.close,
      take_profit: +(latestEth.close + 10).toFixed(2), // Still fixed TP/SL
      stop_loss: +(latestEth.close - 10).toFixed(2),  // Still fixed TP/SL

      // 🔽 新增指标字段 (using latestEth)
      ema5: latestEth.EMA5 ?? null,
      ema20: latestEth.EMA20 ?? null,
      rsi: latestEth.RSI ?? null,

      // ✅ 保持原逻辑不变
      long_score: longSignal.score,
      long_signalTypes: longSignal.types,
      long_reasons: longSignal.reasons,

      short_score: shortSignal.score,
      short_signalTypes: shortSignal.types,
      short_reasons: shortSignal.reasons,
    })
  } catch (err: any) { // Add type annotation for err
    console.error("API Error:", err); // Log the actual error server-side
    res.status(500).json({ error: 'Failed to fetch or compute signal', details: err.message || 'Unknown error' })
  }
}
