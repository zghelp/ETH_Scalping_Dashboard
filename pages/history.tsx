import Head from 'next/head';
import useSWR from 'swr';
import Link from 'next/link';
import type { SignalProps, ScoreDetail, PositionInfoFromAPI } from '@/lib/types'; // Import types
import {
    generateProfessionalRecommendation,
    ActualPositionStatus,
    OpeningSignalSummary, // Import necessary types for recommendation
    MarketContextSummary
} from '@/lib/recommendation'; // Import recommendation logic

// Define structure for Aggregated Trade data (matching backend)
interface AggregatedTrade {
    createTimeMs: number; // Precise MS time
    minuteTimestampMs: number; // Time rounded down to minute
    contract: string;
    // orderId?: string; // Removed
    size: number; // Sum of sizes
    avgPrice: number; // Volume-weighted average price
    // role?: 'taker' | 'maker' | 'mixed'; // Removed
    tradeIds: number[];
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
    // console.log("formatTime received:", timestampMs); // Keep commented out
    if (!timestampMs || isNaN(timestampMs)) {
        // console.log("formatTime returning N/A due to invalid input"); // Keep commented out
        return 'N/A';
    }
    try {
        return new Date(timestampMs).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'medium', hour12: false });
    } catch (e) {
        console.error("Error formatting time:", e, "Input:", timestampMs);
        return 'Error';
    }
};

// Helper to render score details concisely
const renderDetails = (details: ScoreDetail[] | null | undefined): string => {
    if (!details) return '-';
    return details.filter(d => d.met).map(d => d.condition.split('(')[0].trim()).join(', ') || '-';
};

// --- Matching Logic (Based on Minute Timestamps & Configurable Window) ---
const findMatchingTrade = (
    signal: SignalProps, // Pass the whole signal object
    sideToMatch: 'long' | 'short' | '空仓',
    trades: AggregatedTrade[] | undefined,
    timeWindowMinutes: number
): AggregatedTrade | null => {
    if (!signal.time || !trades || sideToMatch === '空仓') {
        return null;
    }

    // Calculate the signal's minute start time
    const signalMinuteTimestampMs = Math.floor(signal.time / 60000) * 60000;
    // Calculate the end of the matching window (exclusive)
    const matchEndTimeMs = signalMinuteTimestampMs + (timeWindowMinutes * 60000);

    for (const aggTrade of trades) {
        // Compare minute timestamps: trade must be in the same minute or later, but before the window ends
        if (aggTrade.minuteTimestampMs >= signalMinuteTimestampMs && aggTrade.minuteTimestampMs < matchEndTimeMs) {
            // Check side
            if ((sideToMatch === 'long' && aggTrade.size > 0) || (sideToMatch === 'short' && aggTrade.size < 0)) {
                return aggTrade; // Found match
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

  // Fetch Aggregated Trade History
   const { data: tradeData, error: tradeError, isLoading: isLoadingTrades } = useSWR<AggregatedTrade[]>('/api/trades', fetcher, {
      refreshInterval: 5 * 60000 // Refresh trades less often
  });

  const isLoading = isLoadingHistory || isLoadingTrades;
  const error = historyError || tradeError;

  // Read matching window from environment variable or default to 5 minutes
  const tradeMatchWindowMinutes = parseInt(process.env.NEXT_PUBLIC_TRADE_MATCH_WINDOW_MINUTES || '5', 10);

  // Log data for debugging
  // console.log("HistoryPage historyData:", historyData);
  // console.log("HistoryPage tradeData:", tradeData);
  // console.log("HistoryPage error:", error);


  return (
    <div className="min-h-screen py-8 px-4">
      <Head>
        <title>信号与交易历史 - ETH Scalping 策略助手</title>
      </Head>
      <main className="max-w-7xl mx-auto space-y-8"> {/* Wider container */}
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
            <h2 className="text-xl font-semibold text-gray-200 mb-4">信号历史记录 (含匹配交易)</h2>
            {!isLoading && !error && (!historyData || historyData.length === 0) && (
                <div className="p-4 text-center text-gray-500 bg-gray-800 rounded-lg">暂无信号历史记录。</div>
            )}
            {historyData && historyData.length > 0 && (
              <div className="overflow-x-auto shadow rounded-lg">
                <table className="min-w-full divide-y divide-gray-700 bg-gray-800 text-xs">
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
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">成交均价</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium text-gray-300 uppercase tracking-wider">滑点</th>
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

                        // Find matching trade using minute timestamps and configured window
                        const matchedTrade = findMatchingTrade(signal, sideToMatch, tradeData, tradeMatchWindowMinutes);
                        // Calculate slippage based on the matched side and avgPrice
                        const slip = matchedTrade && signal.price ? (matchedTrade.avgPrice - signal.price) * (sideToMatch === 'long' ? 1 : -1) : null;

                        return (
                          <tr key={signal.time || index} className="hover:bg-gray-700/40">
                            {/* Signal Data */}
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
                            {/* Matched Trade Data */}
                            <td className={`px-3 py-2 whitespace-nowrap border-l border-gray-600 ${matchedTrade ? 'text-gray-300' : 'text-gray-600'}`}>{matchedTrade ? formatTime(matchedTrade.createTimeMs) : '-'}</td>
                            <td className={`px-3 py-2 whitespace-nowrap ${matchedTrade ? 'text-gray-200' : 'text-gray-600'}`}>{matchedTrade ? `$${matchedTrade.avgPrice.toFixed(2)}` : '-'}</td>
                            <td className={`px-3 py-2 whitespace-nowrap ${slip === null ? 'text-gray-600' : slip > 0 ? 'text-red-400' : 'text-green-400'}`}>{slip?.toFixed(2) ?? '-'}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>

         {/* Trade History Table (Removed - Integrated above) */}
         {/* <div> ... </div> */}
      </main>
    </div>
  );
}
