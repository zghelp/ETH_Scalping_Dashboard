import axios from 'axios'

export async function getLatestKlines(symbol: string, interval: string, limit = 100) {
  const response = await axios.get(
    'https://api.gateio.ws/api/v4/futures/usdt/candlesticks',
    {
      params: { contract: symbol, interval, limit },
    }
  )

  return response.data.map((d: any) => {
    return {
      timestamp: Number(d.t) * 1000,
      open: parseFloat(d.o),
      high: parseFloat(d.h),
      low: parseFloat(d.l),
      close: parseFloat(d.c),
      volume: Number(d.v),
    }
  })
}

export async function getBTCClosePrice(): Promise<number> {
  const response = await axios.get(
    'https://api.gateio.ws/api/v4/futures/usdt/candlesticks',
    {
      params: { contract: 'BTC_USDT', interval: '1m', limit: 2 },
    }
  )
  const latest = response.data[response.data.length - 1]
  return parseFloat(latest.c) || 0
}