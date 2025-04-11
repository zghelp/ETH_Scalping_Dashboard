import Head from 'next/head';
import useSWR from 'swr';
import Link from 'next/link';
import type { SignalProps, ScoreDetail } from '@/lib/types'; // Import types

// Fetcher function for the history API
const fetcher = (url: string): Promise<SignalProps[]> => fetch(url).then(res => {
    if (!res.ok) {
        return res.json().then(errData => {
            throw new Error(errData.error || `HTTP error! status: ${res.status}`);
        }).catch(() => {
             throw new Error(`HTTP error! status: ${res.status}`);
        });
    }
    return res.json();
});

// Helper to format timestamp
const formatTime = (timestamp: number | null | undefined): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'medium', hour12: false });
};

// Helper to render score details concisely
const renderDetails = (details: ScoreDetail[] | null | undefined): string => {
    if (!details) return '-';
    return details.filter(d => d.met).map(d => d.condition.split('(')[0].trim()).join(', ') || '-';
};

export default function HistoryPage() {
  const { data: historyData, error, isLoading } = useSWR<SignalProps[]>('/api/history', fetcher, {
      refreshInterval: 60000 // Refresh history every minute as well
  });

  return (
    <div className="min-h-screen py-8 px-4"> {/* Ensure dark theme applies via globals.css */}
      <Head>
        <title>信号历史记录 - ETH Scalping 策略助手</title>
      </Head>
      <main className="max-w-6xl mx-auto"> {/* Wider container */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-100">📊 信号历史记录</h1>
            <Link href="/" className="text-blue-400 hover:text-blue-300">
                &larr; 返回主页
            </Link>
        </div>

        {isLoading && <div className="p-4 text-center text-gray-400">加载历史记录中...</div>}
        {error && <div className="p-4 text-center text-red-500">加载历史记录时出错: {error.message}</div>}

        {!isLoading && !error && (!historyData || historyData.length === 0) && (
            <div className="p-4 text-center text-gray-500">暂无历史记录。</div>
        )}

        {historyData && historyData.length > 0 && (
          <div className="overflow-x-auto shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-700 bg-gray-800">
              <thead className="bg-gray-700/50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">时间</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">价格</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">FNG</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">BTC Trend</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">15m Trend</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">多头分 (细节)</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">空头分 (细节)</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">持仓</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">扛单分 (细节)</th>
                  {/* Add more columns if needed */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {historyData.map((signal, index) => (
                  <tr key={signal.time || index} className="hover:bg-gray-700/40">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{formatTime(signal.time)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">${signal.price?.toFixed(2) ?? 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{signal.market_context?.fng_value ?? 'N/A'} ({signal.market_context?.fng_classification ?? 'N/A'})</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${signal.market_context?.btc_daily_trend === 'up' ? 'text-green-400' : signal.market_context?.btc_daily_trend === 'down' ? 'text-red-400' : 'text-gray-300'}`}>{signal.market_context?.btc_daily_trend ?? 'N/A'}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${signal.opening_signal?.ema15m_trend === 'up' ? 'text-green-400' : signal.opening_signal?.ema15m_trend === 'down' ? 'text-red-400' : 'text-gray-300'}`}>{signal.opening_signal?.ema15m_trend ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                        <span className={`font-bold ${signal.opening_signal?.long_score >= 6 ? 'text-green-400' : signal.opening_signal?.long_score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>{signal.opening_signal?.long_score ?? 'N/A'}</span>
                        <p className="text-xs text-gray-500 truncate" title={renderDetails(signal.opening_signal?.long_details)}>{renderDetails(signal.opening_signal?.long_details)}</p>
                    </td>
                     <td className="px-4 py-3 text-sm text-gray-300">
                        <span className={`font-bold ${signal.opening_signal?.short_score >= 6 ? 'text-red-400' : signal.opening_signal?.short_score >= 4 ? 'text-yellow-400' : 'text-green-400'}`}>{signal.opening_signal?.short_score ?? 'N/A'}</span>
                        <p className="text-xs text-gray-500 truncate" title={renderDetails(signal.opening_signal?.short_details)}>{renderDetails(signal.opening_signal?.short_details)}</p>
                    </td>
                     <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${signal.position?.side === 'long' ? 'text-green-400' : signal.position?.side === 'short' ? 'text-red-400' : 'text-gray-300'}`}>{signal.position?.side ?? '空仓'}</td>
                     <td className="px-4 py-3 text-sm text-gray-300">
                        {signal.position ? (
                            <>
                                <span className={`font-bold ${signal.holdability_score === null ? 'text-gray-400' : signal.holdability_score >= 6 ? 'text-green-400' : signal.holdability_score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>{signal.holdability_score ?? 'N/A'}</span>
                                <p className="text-xs text-gray-500 truncate" title={renderDetails(signal.holdability_details)}>{renderDetails(signal.holdability_details)}</p>
                            </>
                        ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
