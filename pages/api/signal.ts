import type { NextApiRequest, NextApiResponse } from 'next'
import { getLatestKlines } from '@/lib/gateio'
import { calculateIndicators } from '@/lib/indicators'
import { scoreSignals } from '@/lib/score'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const klines = await getLatestKlines('ETH_USDT', '1m', 100)
    const enriched = calculateIndicators(klines)
    const latest = enriched[enriched.length - 1]

    const longSignal = scoreSignals(enriched, 'long')
    const shortSignal = scoreSignals(enriched, 'short')

    res.status(200).json({
      time: latest.timestamp,
      price: latest.close,
      take_profit: +(latest.close + 10).toFixed(2),
      stop_loss: +(latest.close - 10).toFixed(2),

      // 🔽 新增指标字段
      ema5: latest.EMA5 ?? null,
      ema20: latest.EMA20 ?? null,
      rsi: latest.RSI ?? null,

      // ✅ 保持原逻辑不变
      long_score: longSignal.score,
      long_signalTypes: longSignal.types,
      long_reasons: longSignal.reasons,

      short_score: shortSignal.score,
      short_signalTypes: shortSignal.types,
      short_reasons: shortSignal.reasons,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or compute signal' })
  }
}
