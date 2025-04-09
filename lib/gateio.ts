import axios from 'axios'

export async function getLatestKlines(symbol: string, interval: string, limit = 100) {
  const response = await axios.get(
    'https://api.gateio.ws/api/v4/futures/usdt/candlesticks',
    {
      params: { contract: symbol, interval, limit },
    }
  )

  return response.data.map((d: any[]) => {
    const timestamp = parseInt(d[0]) * 1000
    const volume = parseFloat(d[1])
    const close = parseFloat(d[2])
    const high = parseFloat(d[3])
    const low = parseFloat(d[4])
    const open = parseFloat(d[5])

    return {
      timestamp: isNaN(timestamp) ? Date.now() : timestamp,
      volume: isNaN(volume) ? 0 : volume,
      close: isNaN(close) ? 0 : close,
      high: isNaN(high) ? 0 : high,
      low: isNaN(low) ? 0 : low,
      open: isNaN(open) ? 0 : open,
    }
  })
}
