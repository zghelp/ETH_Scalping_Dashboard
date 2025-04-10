import Head from 'next/head'
import useSWR from 'swr'
import SignalCard from '@/components/SignalCard'
import SignalDecision from '@/components/SignalDecision';
import type { SignalProps } from '@/lib/types'; // Import the updated type

const fetcher = (url: string): Promise<SignalProps> => fetch(url).then(res => {
    if (!res.ok) {
        // Try to parse error details from Gate.io if possible
        return res.json().then(errData => {
            throw new Error(errData.error || `HTTP error! status: ${res.status}`);
        }).catch(() => {
             throw new Error(`HTTP error! status: ${res.status}`);
        });
    }
    return res.json();
});

export default function Home() {
  // Use the SignalProps type with useSWR for better type safety
  const { data, isLoading, error } = useSWR<SignalProps>('/api/signal', fetcher, {
    refreshInterval: 60000 // Refresh every 60 seconds
  });

  // Handle loading and initial error states more gracefully
  if (error) return <div className="p-4 text-center text-red-500">加载信号时出错: {error.message}</div>;
  if (!data && isLoading) return <div className="p-4 text-center text-gray-500">加载中...</div>;
  // Handle case where data might be fetched but is empty/invalid (though API should handle this)
  if (!data) return <div className="p-4 text-center text-gray-500">无法获取信号数据。</div>;


  return (
    // Remove background classes here, handled by body style now
    <div className="dark min-h-screen py-8 px-4">
      <Head>
        <title>ETH Scalping 策略助手</title>
      </Head>
      {/* Adjust max-width to accommodate wider card */}
      <main className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">🚀 ETH Scalping 策略助手</h1>

        {/* Pass data to SignalDecision based on its updated Props */}
        <SignalDecision
            opening_signal={data.opening_signal ?? null}
            holdability_score={data.holdability_score ?? null}
            holdability_details={data.holdability_details ?? null}
            position={data.position ?? null}
            market_context={data.market_context ?? null}
        />

        {/* Pass the entire data object or specific parts according to SignalProps */}
        <SignalCard
          time={data.time}
          price={data.price}
          opening_signal={data.opening_signal}
          holdability_score={data.holdability_score}
          holdability_details={data.holdability_details}
          position={data.position}
          indicators_1m={data.indicators_1m}
          indicators_15m={data.indicators_15m}
          // Pass loading and error states from useSWR
          isLoading={isLoading}
          error={error}
          // Pass recommendation if it's part of the data structure
          // recommendation={data.recommendation}
          // recommendationReasons={data.recommendationReasons}
        />

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">自动刷新每 60 秒 | Powered by Gate.io API</p>
      </main>
    </div>
  )
}
