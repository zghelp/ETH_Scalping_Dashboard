import useSWR from 'swr'
import Head from 'next/head'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function IndicatorDebugPage() {
  const { data, isLoading, error } = useSWR('/api/signal', fetcher, {
    refreshInterval: 30000,
  })

  if (isLoading || !data) return <div className="p-6">📊 加载中...</div>
  if (error) return <div className="p-6 text-red-500">❌ 数据加载失败</div>

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <Head>
        <title>指标调试页面 | ETH Scalping</title>
      </Head>
      <div className="max-w-2xl mx-auto bg-white shadow-md rounded p-6">
        <h2 className="text-xl font-semibold mb-4">📈 指标调试 - 最新数据</h2>
        <div className="text-sm space-y-1">
          <p><strong>时间：</strong>{new Date(data.time).toLocaleString('zh-CN')}</p>
          <p><strong>当前价格：</strong>${data.price}</p>
          <p><strong>EMA5：</strong>{data.ema5 ?? '--'}</p>
          <p><strong>EMA20：</strong>{data.ema20 ?? '--'}</p>
          <p><strong>RSI：</strong>{data.rsi ?? '--'}</p>
          <p><strong>止盈：</strong>${data.take_profit}</p>
          <p><strong>止损：</strong>${data.stop_loss}</p>
        </div>

        <hr className="my-4" />

        <h3 className="text-md font-semibold mb-2">📋 原始打分信号</h3>
        <div className="space-y-2">
          <p><strong>多头评分：</strong>{data.long_score} | 类型：{data.long_signalTypes.join(', ')}</p>
          <ul className="list-disc list-inside text-green-600">
            {data.long_reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ul>
          <p className="mt-4"><strong>空头评分：</strong>{data.short_score} | 类型：{data.short_signalTypes.join(', ')}</p>
          <ul className="list-disc list-inside text-red-600">
            {data.short_reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}