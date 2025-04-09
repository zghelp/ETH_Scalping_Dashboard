import Head from 'next/head'
import useSWR from 'swr'
import SignalCard from '@/components/SignalCard'
import SignalDecision from '@/components/SignalDecision'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Home() {
  const { data, isLoading, error } = useSWR('/api/signal', fetcher, {
    refreshInterval: 60000
  })

  if (!data) return <div className="p-4">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <Head>
        <title>ETH Scalping 策略助手</title>
      </Head>
      <main className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">🚀 ETH Scalping 策略助手</h1>
        <SignalDecision
          long={{
            score: data.long_score,
            signalTypes: data.long_signalTypes,
            reasons: data.long_reasons
          }}
          short={{
            score: data.short_score,
            signalTypes: data.short_signalTypes,
            reasons: data.short_reasons
          }}
        />
        <SignalCard signal={data} isLoading={isLoading} error={error} />
        <p className="text-center text-xs text-gray-500 mt-6">自动刷新每60秒 | Powered by Gate.io API</p>
      </main>
    </div>
  )
}