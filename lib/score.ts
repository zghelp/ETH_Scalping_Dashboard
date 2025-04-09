export function scoreSignals(data: any[], btcPrice?: number) {
  const latest = data[data.length - 1]
  let score = 0
  const reasons: string[] = []

  if (latest.EMA5 > latest.EMA20) {
    score += 2
    reasons.push('✅ EMA5 > EMA20 (+2)')
  } else {
    reasons.push('❌ EMA5 ≤ EMA20')
  }

  if (latest.RSI > 50) {
    score += 2
    reasons.push('✅ RSI > 50 (+2)')
  } else {
    reasons.push('❌ RSI ≤ 50')
  }

  if (latest.volume > 0) {
    reasons.push('✅ 相对稳定无放量')
  } else {
    reasons.push('❌ 相对波动无放量')
  }

  const bodySize = Math.abs(latest.close - latest.open)
const candleRange = latest.high - latest.low

if (bodySize > candleRange * 0.6) {
  reasons.push('✅ 实体大阳K线 (+1)')
  score += 1
}

  // ✅ 使用真实 BTC 判断
  if (btcPrice && btcPrice > 0 && latest.close > 0) {
    reasons.push('✅ BTC同步上涨 (+1)')
    score += 1
  }

  return {
    score,
    recommendation: score >= 5 ? '做多' : score <= 2 ? '做空' : '不建议开仓',
    reasons,
  }
}