import { CandleData } from './types'

export function scoreSignals(data: CandleData[], direction: 'long' | 'short') {
  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  const reasons: string[] = []
  const types: string[] = []
  let score = 0

  const emaCondition = direction === 'long'
    ? latest.EMA5 > latest.EMA20
    : latest.EMA5 < latest.EMA20

  if (emaCondition) {
    reasons.push('EMA5 与 EMA20 方向共振')
    types.push('A')
    score += 2
  }

  const rsiCondition = direction === 'long'
    ? latest.RSI > 50
    : latest.RSI < 50

  if (rsiCondition) {
    reasons.push('RSI 趋势支撑当前方向')
    types.push('A')
    score += 2
  }

  const volumeSpike = latest.volume > prev.volume * 1.2
  if (volumeSpike) {
    reasons.push('出现有效放量')
    types.push('B')
    score += 1
  }

  const longK = (latest.close - latest.open) > Math.abs(latest.open - latest.low) &&
                (latest.close > latest.open) === (direction === 'long')

  if (longK) {
    reasons.push('出现实体趋势K线')
    types.push('B')
    score += 1
  }

  // ✅ 使用真实 BTC 与 ETH 同步方向判断
  if (
    latest.ETH_close > prev.ETH_close &&
    latest.BTC_close > prev.BTC_close &&
    direction === 'long'
  ) {
    reasons.push('BTC 同步上涨，确认多头共振')
    types.push('A')
    score += 1
  }

  if (
    latest.ETH_close < prev.ETH_close &&
    latest.BTC_close < prev.BTC_close &&
    direction === 'short'
  ) {
    reasons.push('BTC 同步下跌，确认空头共振')
    types.push('A')
    score += 1
  }

  return { score, reasons, types }
}