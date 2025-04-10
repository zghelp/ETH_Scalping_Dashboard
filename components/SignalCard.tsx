import React from 'react';
import type { SignalProps, ScoreDetail } from '@/lib/types'; // Import ScoreDetail

// Helper to format score details - Use colors suitable for dark bg
const renderScoreDetail = (detail: ScoreDetail) => {
  const color = detail.met ? 'text-green-400' : 'text-red-400'; // Use lighter colors directly
  const symbol = detail.met ? '✓' : '✗';
  return (
    <li key={detail.condition} className={`flex justify-between ${color}`}>
      <span>{symbol} {detail.condition}</span>
      <span>({detail.met ? `+${detail.score}` : '+0'})</span>
    </li>
  );
};


export default function SignalCard(props: SignalProps) {
  const {
    time,
    price,
    opening_signal,
    holdability_score,
    holdability_details,
    position,
    indicators_1m,
    indicators_15m,
    market_context, // Add market context
    isLoading,
    error,
    recommendation, // Keep recommendation if still used
    recommendationReasons,
  } = props;

  const timeStr = time ? new Date(time).toLocaleString('zh-CN', { hour12: false }) : '--';

  if (isLoading) {
    // Ensure loading text is visible in dark mode
    return <div className="p-4 text-center text-gray-400">加载中...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">错误: {error.message || JSON.stringify(error)}</div>;
  }

  // Duplicated destructuring block removed. Props are already destructured above.
  // Duplicated timeStr removed.

  return (
    // Set default styles for forced dark theme
    <div className="p-4 rounded border bg-gray-800 border-gray-700 shadow max-w-3xl mx-auto mt-6 space-y-4 text-gray-100">
      {/* Top Info & Market Context */}
      <div className="border-b pb-3 border-gray-700 space-y-2">
         {/* Price & Time Row */}
         <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="text-sm text-gray-400">数据时间: {timeStr}</div>
            <div className="text-xl font-semibold text-white">
              当前价格: ${price?.toFixed(2) ?? '--'}
            </div>
            <div className={`text-sm ${indicators_15m?.ema15 && price && price > indicators_15m.ema15 ? 'text-green-400' : 'text-red-400'}`}>
              15m趋势: {opening_signal?.ema15m_trend ?? '--'} (EMA15: ${indicators_15m?.ema15?.toFixed(2) ?? '--'})
            </div>
         </div>
         {/* Market Context Row */}
         <div className="flex flex-col md:flex-row justify-between items-center gap-x-4 gap-y-1 text-xs text-gray-400">
             <div>
                 恐慌贪婪指数: <span className="font-medium text-gray-200">{market_context?.fng_value ?? 'N/A'} ({market_context?.fng_classification ?? 'N/A'})</span>
             </div>
             <div>
                 BTC日线趋势: <span className={`font-medium ${market_context?.btc_daily_trend === 'up' ? 'text-green-400' : market_context?.btc_daily_trend === 'down' ? 'text-red-400' : 'text-gray-200'}`}>
                     {market_context?.btc_daily_trend ?? 'N/A'}
                 </span>
                 {market_context?.btc_daily_ema50 && (
                     <span className="text-gray-500"> (EMA50: {market_context.btc_daily_ema50.toFixed(2)})</span>
                 )}
             </div>
         </div>
      </div>

      {/* Recommendation (If still used) - Assuming it's handled by SignalDecision now */}
      {/* {recommendation && ( ... )} */}

      {/* Position Info & Holdability Score */}
      {position && (
        <div className="p-3 rounded bg-blue-900/30 border border-blue-800/50">
          <div className="font-semibold mb-2 text-blue-300">当前持仓信息 & 扛单评分</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-2 text-gray-300">
            <div>方向: <span className={`font-bold ${position.side === 'long' ? 'text-green-400' : 'text-red-400'}`}>{position.side === 'long' ? '多头' : '空头'}</span></div>
            <div>开仓价: ${position.entryPrice?.toFixed(2) ?? '--'}</div>
            <div>强平价: ${position.liquidationPrice?.toFixed(2) ?? 'N/A'}</div>
          </div>
          <div className="flex items-center mb-1 text-gray-200">
            <div className="font-semibold mr-2">扛单能力评分:</div>
            <div className={`text-xl font-bold ${holdability_score === null ? 'text-gray-400' : holdability_score >= 6 ? 'text-green-400' : holdability_score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
              {holdability_score ?? 'N/A'} / 9
            </div>
          </div>
          <ul className="text-xs text-gray-400 space-y-1">
            {holdability_details?.map(renderScoreDetail)}
          </ul>
        </div>
      )}

      {/* Opening Signal Score */}
      <div className="p-3 rounded bg-gray-700/50">
        <div className="font-semibold mb-2 text-gray-200">开仓信号评分 (Max: 10)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Long Score Details */}
          <div>
            <div className="flex items-center mb-1 text-gray-200">
              <div className="font-semibold mr-2">📈 多头评分:</div>
              <div className={`text-lg font-bold ${opening_signal?.long_score === null ? 'text-gray-400' : opening_signal?.long_score >= 6 ? 'text-green-400' : opening_signal?.long_score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                 {opening_signal?.long_score ?? '--'}
              </div>
            </div>
            <ul className="text-xs text-gray-400 space-y-1">
              {opening_signal?.long_details?.map(renderScoreDetail)}
            </ul>
          </div>
          {/* Short Score Details */}
          <div>
             <div className="flex items-center mb-1 text-gray-200">
              <div className="font-semibold mr-2">📉 空头评分:</div>
              <div className={`text-lg font-bold ${opening_signal?.short_score === null ? 'text-gray-400' : opening_signal?.short_score >= 6 ? 'text-red-400' : opening_signal?.short_score >= 4 ? 'text-yellow-400' : 'text-green-400'}`}>
                 {opening_signal?.short_score ?? '--'}
              </div>
            </div>
             <ul className="text-xs text-gray-400 space-y-1">
              {opening_signal?.short_details?.map(renderScoreDetail)}
            </ul>
          </div>
        </div>
      </div>

      {/* Key Indicators Display */}
      <div className="p-3 rounded bg-gray-700/50 text-xs">
         <div className="font-semibold mb-2 text-gray-200">关键指标 (1m)</div>
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
            {indicators_1m && Object.entries(indicators_1m).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                    <span className="text-gray-400">{key}:</span>
                    <span className="font-medium text-gray-200">
                        {typeof value === 'number' ? value.toFixed(2) : value ?? '--'}
                    </span>
                </div>
            ))}
         </div>
      </div>

    </div>
  );
}
