import type { NextApiRequest, NextApiResponse } from 'next'
import { getLatestKlines } from '@/lib/gateio'
import { calculateIndicators } from '@/lib/indicators'
import { scoreSignals } from '@/lib/score'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const klines = await getLatestKlines('ETH_USDT', '1m', 100)
    const enriched = calculateIndicators(klines)
    const latest = enriched[enriched.length - 1]
    const signal = scoreSignals(enriched)

    res.status(200).json({
      time: latest.timestamp,
      price: latest.close,
      score: signal.score,
      recommendation: signal.recommendation,
      reasons: signal.reasons,
      take_profit: +(latest.close + 10).toFixed(2),
      stop_loss: +(latest.close - 10).toFixed(2),
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or compute signal' })
  }
}
