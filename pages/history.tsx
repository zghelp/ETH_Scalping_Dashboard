import Head from 'next/head';
import useSWR from 'swr';
import Link from 'next/link';
import type { SignalProps, ScoreDetail, PositionInfoFromAPI } from '@/lib/types'; // Import types
import { generateProfessionalRecommendation, ActualPositionStatus } from '@/lib/recommendation'; // Import recommendation logic

// Define structure for Gate.io Trade data
interface FuturesTrade {
    id?: number;
    createTime?: number; // Timestamp in seconds
    createTimeMs?: number; // Timestamp in milliseconds
    contract?: string;
    orderId?: string;
    size?: number; // Positive for long, negative for short
    price?: string;
    role?: 'taker' | 'maker';
    text?: string;
}

// Fetcher function for history and trades API
const fetcher = (url: string): Promise<any> => fetch(url).then(res => {
    if (!res.ok) {
        return res.json().then(errData => {
            throw new Error(errData.error || `HTTP error! status: ${res.status}`);
        }).catch(() => {
             throw new Error(`HTTP error! status: ${res.status}`);
        });
    }
    return res.json();
});

// Helper to format timestamp (always expects milliseconds)
const formatTime = (timestampMs: number | null | undefined): string => {
    if (!timestampMs) return 'N/A';
    return new Date(timestampMs).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'medium', hour12: false });
};

// Helper to render score details concisely
const renderDetails = (details: ScoreDetail[] | null | undefined): string => {
    if (!details) return '-';
    return details.filter(d => d.met).map(d => d.condition.split('(')[0].trim()).join(', ') || '-';
};

// Removed findMatchingTrade function

export default function HistoryPage() {
  // Fetch Signal History
  const { data: historyData, error: historyError, isLoading: isLoadingHistory } = useSWR<SignalProps[]>('/api/history', fetcher, {
      refreshInterval: 60000 // Refresh history every minute
  });

  // Fetch Trade History
   const { data: tradeData, error: tradeError, isLoading: isLoadingTrades } = useSWR<FuturesTrade[]>('/api/trades', fetcher, {
      refreshInterval: 5 * 60000 // Refresh trades less often
  });

  const isLoading = isLoadingHistory || isLoadingTrades;
  const error = historyError || tradeError;

  // Log data for debugging
  // console.log("HistoryPage historyData:", historyData);
  // console.log("HistoryPage tradeData:", tradeData);
  // console.log("HistoryPage error:", error);


  return (
    <div className="min-h-screen py-8 px-4">
      <Head>
        <title>信号与交易历史 - ETH Scalping 策略助手</title>
      </Head>
      <main className="max-w-7xl mx-auto space-y-8"> {/* Add space between tables */}
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-100">📊 信号与交易历史</h1>
            <Link href="/" className="text-blue-400 hover:text-blue-300">
                &larr; 返回主页
            </Link>
        </div>

        {isLoading && <div className="p-4 text-center text-gray-400">加载历史记录中...</div>}
        {error && <div className="p-4 text-center text-red-500">加载历史记录时出错: {error.message}</div>}

        {/* Signal History Table */}
        <div>
            <h2 className="text-xl font-semibold text-gray-200 mb-4">信号历史记录</h2>
            {!isLoading && !error && (!historyData || historyData.length === 0) && (
                <div className="p-4 text-center text-gray-500 bg-gray-800 rounded-lg">暂无信号历史记录。</div>
            )}
            {historyData && historyData.length > 0 && (
              <div className="overflow-x-auto shadow rounded-lg">
                <table className="min-w-full divide-y divide-gray-700 bg-gray-800 text-xs">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">信号时间</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">信号价格</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">FNG</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">BTC Trend</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">15m Trend</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">多头分</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">空头分</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">持仓</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">扛单分</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">建议操作 (理由)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {historyData.map((signal, index) => {
                        // Determine the position status at the time of the signal for recommendation recalc
                        const positionStatus: ActualPositionStatus = signal.position ? signal.position.side : '空仓';
                        // Recalculate recommendation based on historical data
                        const recommendation = generateProfessionalRecommendation(
                            positionStatus,
                            signal.opening_signal ?? null,
                            signal.holdability_score ?? null,
                            signal.holdability_details ?? null,
                            signal.market_context ?? null
                        );

                        return (
                          <tr key={signal.time || index} className="hover:bg-gray-700/40">
                            <td className="px-3 py-2 whitespace-nowrap text-gray-400">{formatTime(signal.time)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-200">${signal.price?.toFixed(2) ?? 'N/A'}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-300">{signal.market_context?.fng_value ?? 'N/A'} ({signal.market_context?.fng_classification?.[0] ?? 'N/A'})</td>
                            <td className={`px-3 py-2 whitespace-nowrap font-medium ${signal.market_context?.btc_daily_trend === 'up' ? 'text-green-400' : signal.market_context?.btc_daily_trend === 'down' ? 'text-red-400' : 'text-gray-300'}`}>{signal.market_context?.btc_daily_trend ?? 'N/A'}</td>
                            <td className={`px-3 py-2 whitespace-nowrap font-medium ${signal.opening_signal?.ema15m_trend === 'up' ? 'text-green-400' : signal.opening_signal?.ema15m_trend === 'down' ? 'text-red-400' : 'text-gray-300'}`}>{signal.opening_signal?.ema15m_trend ?? 'N/A'}</td>
                            <td className="px-3 py-2 text-gray-300">
                                <span className={`font-bold ${signal.opening_signal?.long_score >= 6 ? 'text-green-400' : signal.opening_signal?.long_score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>{signal.opening_signal?.long_score ?? 'N/A'}</span>
                            </td>
                             <td className="px-3 py-2 text-gray-300">
                                <span className={`font-bold ${signal.opening_signal?.short_score >= 6 ? 'text-red-400' : signal.opening_signal?.short_score >= 4 ? 'text-yellow-400' : 'text-green-400'}`}>{signal.opening_signal?.short_score ?? 'N/A'}</span>
                            </td>
                             <td className={`px-3 py-2 whitespace-nowrap font-medium ${signal.position?.side === 'long' ? 'text-green-400' : signal.position?.side === 'short' ? 'text-red-400' : 'text-gray-300'}`}>{signal.position?.side ?? '空仓'}</td>
                             <td className="px-3 py-2 text-gray-300">
                                {signal.position ? (
                                    <span className={`font-bold ${signal.holdability_score === null ? 'text-gray-400' : signal.holdability_score >= 6 ? 'text-green-400' : signal.holdability_score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>{signal.holdability_score ?? 'N/A'}</span>
                                ) : '-'}
                            </td>
                            <td className="px-3 py-2 text-blue-300 font-semibold" title={recommendation.reasons?.join(', ')}>{recommendation.action}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>

         {/* Trade History Table */}
         <div>
            <h2 className="text-xl font-semibold text-gray-200 mb-4">最近成交记录</h2>
             {!isLoading && !error && (!tradeData || tradeData.length === 0) && (
                <div className="p-4 text-center text-gray-500 bg-gray-800 rounded-lg">未找到最近成交记录。</div>
            )}
            {tradeData && tradeData.length > 0 && (
              <div className="overflow-x-auto shadow rounded-lg">
                <table className="min-w-full divide-y divide-gray-700 bg-gray-800 text-xs">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">成交 ID</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">成交时间</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">方向</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">数量</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">成交价格</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">角色</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {tradeData.map((trade) => {
                        const tradeTimeMs = trade.createTimeMs ?? (trade.createTime ? trade.createTime * 1000 : null);
                        const tradeSide = (trade.size ?? 0) > 0 ? '买入' : (trade.size ?? 0) < 0 ? '卖出' : '未知';
                        const sideColor = tradeSide === '买入' ? 'text-green-400' : tradeSide === '卖出' ? 'text-red-400' : 'text-gray-300';

                        return (
                          <tr key={trade.id} className="hover:bg-gray-700/40">
                            <td className="px-3 py-2 whitespace-nowrap text-gray-500">{trade.id ?? 'N/A'}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-400">{formatTime(tradeTimeMs)}</td>
                            <td className={`px-3 py-2 whitespace-nowrap font-medium ${sideColor}`}>{tradeSide}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-300">{Math.abs(trade.size ?? 0)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-200">${parseFloat(trade.price ?? '0').toFixed(2)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-400">{trade.role ?? 'N/A'}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            )}
         </div>
      </main>
    </div>
  );
}
