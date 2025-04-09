import axios from 'axios'

export async function getLatestKlines(symbol: string, interval: string, limit = 100) {
  const response = await axios.get(
    'https://api.gateio.ws/api/v4/futures/usdt/candlesticks',
    {
      params: { contract: symbol, interval, limit },
    }
  )

  // 有些环境下 d[0] 是字符串或空，需先确认 parse 成功
  return response.data.map((d: any[]) => {
    const [
      timestamp,
      volume,
      close,
      high,
      low,
      open,
    ] = d.map((v) => parseFloat(v))

    return {
      timestamp: isNaN(timestamp) ? Date.now() : timestamp * 1000,
      volume: isNaN(volume) ? 0 : volume,
      close: isNaN(close) ? 0 : close,
      high: isNaN(high) ? 0 : high,
      low: isNaN(low) ? 0 : low,
      open: isNaN(open) ? 0 : open,
    }
  })
}
