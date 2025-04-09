import axios from 'axios'

export async function getLatestKlines(symbol: string, interval: string, limit = 100) {
  const response = await axios.get(`https://api.gateio.ws/api/v4/futures/usdt/candlesticks`, {
    params: { contract: symbol, interval, limit }
  })

  return response.data.map((d: any) => ({
    timestamp: Number(d[0]) * 1000,
    volume: parseFloat(d[1]),
    close: parseFloat(d[2]),
    high: parseFloat(d[3]),
    low: parseFloat(d[4]),
    open: parseFloat(d[5]),
  }))
}
