export function scoreSignals(data: any[]) {
  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  let score = 0
  const reasons = []

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

  if (latest.close > latest.open && latest.volume > prev.volume) {
    score += 2
    reasons.push('✅ 阳线 + 放量 (+2)')
  } else {
    reasons.push('❌ 非阳线或无放量')
  }

  const recentLow = Math.min(...data.slice(-5).map(d => d.low))
  if (latest.close - recentLow < 5) {
    score += 1
    reasons.push('✅ 接近支撑 (+1)')
  } else {
    reasons.push('❌ 远离支撑')
  }

  // 模拟鲸鱼判断（可替换为实际监控模块）
  score += 1
  reasons.push('✅ 模拟BTC同步上涨 (+1)')

  const recommendation = score >= 6 ? '做多' : score >= 4 ? '观望' : '不建议开仓'

  return { score, reasons, recommendation }
}
