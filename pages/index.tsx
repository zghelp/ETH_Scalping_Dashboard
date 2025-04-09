import Head from 'next/head'
import SignalCard from '@/components/SignalCard'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Home() {
  const { data, error } = useSWR('/api/signal', fetcher, { refreshInterval: 60000 }) // 每分钟自动刷新

  return (
    <>
      <Head>
        <title>ETH 策略助手</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <main className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">🚀 ETH Scalping 策略助手</h1>
        {error && <p className="text-red-500">加载失败，请稍后重试</p>}
        {!data && <p className="text-gray-600">加载中...</p>}
        {data && <SignalCard {...data} />}
        <footer className="text-sm text-gray-400 mt-6">自动刷新每60秒 | Powered by Gate.io API</footer>
      </main>
    </>
  )
}
