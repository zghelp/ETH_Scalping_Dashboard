import Head from 'next/head';
import useSWR from 'swr';
import Link from 'next/link';
import type { SignalProps, ScoreDetail, PositionInfoFromAPI } from '@/lib/types'; // Import types
import { generateProfessionalRecommendation, ActualPositionStatus } from '@/lib/recommendation'; // Import recommendation logic

// Define structure for Gate.io Trade data (adjust based on actual API response)
interface FuturesTrade {
    id?: number;
    createTime?: number; // Timestamp in seconds
    createTimeMs?: number; // Timestamp in milliseconds
    contract?: string;
    orderId?: string; // Corresponding order ID
    size?: number; // Trade size, positive for long, negative for short
    price?: string; // Trade price
    role?: 'taker' | 'maker';
    text?: string; // User defined text field in order
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
// Removed formatTimeSeconds as we'll handle conversion in findMatchingTrade if needed


// Helper to render score details concisely
const renderDetails = (details: ScoreDetail[] | null | undefined): string => {
    if (!details) return '-';
    return details.filter(d => d.met).map(d => d.condition.split('(')[0].trim()).join(', ') || '-';
};

// --- Matching Logic ---
const findMatchingTrade = (
    signalTimeMs: number | null | undefined,
    signalSide: 'long' | 'short' | '空仓', // Side suggested by signal or actual position side at that time
    trades: FuturesTrade[] | undefined,
    timeWindowMinutes: number = 2 // Look for trades within +/- X minutes of the signal
): FuturesTrade | null => {
    // Match based on recommended action side, not necessarily current position side
    if (!signalTimeMs || !trades || signalSide === '空仓') {
        return null;
    }

    const timeWindowMs = timeWindowMinutes * 60 * 1000;
    // signalTimeMs is assumed to be in milliseconds from API

    for (const trade of trades) {
        // Use createTimeMs if available, otherwise convert createTime (seconds) to ms
        const tradeTimeMs = trade.createTimeMs ?? (trade.createTime ? trade.createTime * 1000 : null);
        const tradeSize = trade.size ?? 0;

        if (!tradeTimeMs) continue;

        // Check time window using milliseconds directly
        if (Math.abs(tradeTimeMs - signalTimeMs) <= timeWindowMs) {
            // Check side: Match trade direction with the signal direction being checked
            if ((signalSide === 'long' && tradeSize > 0) || (signalSide === 'short' && tradeSize < 0)) {
                // Found a potential match (simplistic: first one found in window)
                // More complex logic could find the closest one or sum up trades if order filled partially
                return trade;
            }
        }
    }
    return null; // No match found
};


export default function HistoryPage() {
  // Fetch Signal History
  const { data: historyData, error: historyError, isLoading: isLoadingHistory } = useSWR<SignalProps[]>('/api/history', fetcher, {
      refreshInterval: 60000 // Refresh history every minute
  });

  // Fetch Trade History
   const { data: tradeData, error: tradeError, isLoading: isLoadingTrades } = useSWR<FuturesTrade[]>('/api/trades', fetcher, {
      refreshInterval: 5 * 60000 // Refresh trades less often, e.g., every 5 mins
  });

  const isLoading = isLoadingHistory || isLoadingTrades;
  const error = historyError || tradeError;

  // Read matching window from environment variable or default to 5 minutes
  // Ensure correct access for browser environment
  const tradeMatchWindowMinutes = parseInt(process.env.NEXT_PUBLIC_TRADE_MATCH_WINDOW_MINUTES || '5', 10);

  // Log trade data for debugging
  console.log("HistoryPage tradeData:", tradeData);
  console.log("HistoryPage tradeError:", tradeError);

  return (
    <div className="min-h-screen py-8 px-4">
      <Head>
        <title>信号与交易历史 - ETH Scalping 策略助手</title>
      </Head>
      <main className="max-w-7xl mx-auto"> {/* Even Wider container */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-100">📊 信号与交易历史</h1>
            <Link href="/" className="text-blue-400 hover:text-blue-300">
                &larr; 返回主页
            </Link>
        </div>

        {isLoading && <div className="p-4 text-center text-gray-400">加载历史记录中...</div>}
        {error && <div className="p-4 text-center text-red-500">加载历史记录时出错: {error.message}</div>}

        {!isLoading && !error && (!historyData || historyData.length === 0) && (
            <div className="p-4 text-center text-gray-500">暂无信号历史记录。</div>
        )}

        {historyData && historyData.length > 0 && (
          <div className="overflow-x-auto shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-700 bg-gray-800 text-xs"> {/* Smaller base text */}
              <thead className="bg-gray-700/50">
                <tr>
                  {/* Signal Data Columns */}
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">信号时间</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">信号价格</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">FNG</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">BTC Trend</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">15m Trend</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">多头分</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">空头分</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">持仓</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">扛单分</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">建议操作</th>
                  {/* Matched Trade Columns */}
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider border-l border-gray-600">匹配成交时间</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">成交价格</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">滑点</th>
                  {/* Add PnL later if needed */}
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

                    // Determine the side to look for based on the recommendation action
                    let sideToMatch: 'long' | 'short' | '空仓' = '空仓';
                    if (recommendation.action.includes('开多') || recommendation.action.includes('平空')) {
                        sideToMatch = 'long'; // Look for a buy trade
                    } else if (recommendation.action.includes('开空') || recommendation.action.includes('平多')) {
                        sideToMatch = 'short'; // Look for a sell trade
                    }

                    // --- Add Debug Logs ---
                    console.log(`[Match Debug ${index}] Signal Time: ${signal.time} (${formatTime(signal.time)}), Side to Match: ${sideToMatch}`);

                    // Find matching trade using the recommended side and configured window
                    const matchedTrade = findMatchingTrade(signal.time, sideToMatch, tradeData, tradeMatchWindowMinutes);

                    console.log(`[Match Debug ${index}] Matched Trade:`, matchedTrade); // Log the result
                    // ----------------------

                    // Calculate slippage based on the matched side
                    const slip = matchedTrade?.price && signal.price ? (parseFloat(matchedTrade.price) - signal.price) * (sideToMatch === 'long' ? 1 : -1) : null;

                    return (
                      <tr key={signal.time || index} className="hover:bg-gray-700/40">
                        {/* Signal Data */}
                        <td className="px-3 py-2 whitespace-nowrap text-gray-400">{formatTime(signal.time)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-200">${signal.price?.toFixed(2) ?? 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-300">{signal.market_context?.fng_value ?? 'N/A'} ({signal.market_context?.fng_classification?.[0] ?? 'N/A'})</td>{/* Shorten FNG class */}
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
                        <td className="px-3 py-2 text-blue-300 font-semibold">{recommendation.action}</td>
                        {/* Matched Trade Data */}
                        {/* Use formatTime and ensure we pass milliseconds */}
                        <td className={`px-3 py-2 whitespace-nowrap border-l border-gray-600 ${matchedTrade ? 'text-gray-300' : 'text-gray-600'}`}>{matchedTrade ? formatTime(matchedTrade.createTimeMs ?? (matchedTrade.createTime ? matchedTrade.createTime * 1000 : null)) : '-'}</td>
                        <td className={`px-3 py-2 whitespace-nowrap ${matchedTrade ? 'text-gray-200' : 'text-gray-600'}`}>{matchedTrade ? `$${parseFloat(matchedTrade.price!).toFixed(2)}` : '-'}</td>
                         <td className={`px-3 py-2 whitespace-nowrap ${slip === null ? 'text-gray-600' : slip > 0 ? 'text-red-400' : 'text-green-400'}`}>{slip?.toFixed(2) ?? '-'}</td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
