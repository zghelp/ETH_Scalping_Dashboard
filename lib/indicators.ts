export function calculateIndicators(data: any[]) {
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1)
    return arr.reduce((acc, price, idx) => {
      if (idx === 0) return [price]
      const prev = acc[acc.length - 1]
      acc.push(price * k + prev * (1 - k))
      return acc
    }, [] as number[])
  }

  const closes = data.map(d => d.close)
  const ema5 = ema(closes, 5)
  const ema20 = ema(closes, 20)

  const rsi = (() => {
    const result: number[] = []
    for (let i = 14; i < closes.length; i++) {
      const slice = closes.slice(i - 14, i)
      const gains = slice.map((v, j) => j > 0 ? Math.max(v - slice[j - 1], 0) : 0)
      const losses = slice.map((v, j) => j > 0 ? Math.max(slice[j - 1] - v, 0) : 0)
      const avgGain = gains.reduce((a, b) => a + b, 0) / 14
      const avgLoss = losses.reduce((a, b) => a + b, 0) / 14
      const rs = avgGain / (avgLoss || 1e-6)
      result.push(100 - 100 / (1 + rs))
    }
    return Array(closes.length - result.length).fill(null).concat(result)
  })()

  return data.map((d, i) => ({
    ...d,               // 保留原始字段，如 close、open 等
    EMA5: ema5[i],
    EMA20: ema20[i],
    RSI: rsi[i],
  }))
}
