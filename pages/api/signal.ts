import type { NextApiRequest, NextApiResponse } from 'next'
import { getLatestKlines, getBTCClosePrice } from '@/lib/gateio'
import { calculateIndicators } from '@/lib/indicators'
import { scoreSignals } from '@/lib/score'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const klines = await getLatestKlines('ETH_USDT', '1m', 100)
    const btcPrice = await getBTCClosePrice()

    const enriched = calculateIndicators(klines)
    const latest = enriched[enriched.length - 1]

    if (!latest || typeof latest.close !== 'number' || isNaN(latest.close)) {
      console.warn('⚠️ latest 数据无效', latest)
      return res.status(200).json({
        time: null,
        price: null,
        score: null,
        recommendation: '数据缺失',
        take_profit: null,
        stop_loss: null,
        reasons: ['行情数据格式异常'],
      })
    }

    console.log('✅ 最新价格:', latest.close)

    const signal = scoreSignals(enriched, btcPrice)

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
    console.error('❌ API 报错:', err)
    res.status(500).json({ error: 'Failed to fetch or compute signal' })
  }
}