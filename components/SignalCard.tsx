import React from 'react';
import type { SignalProps, ScoreDetail } from '@/lib/types'; // Import ScoreDetail

// Helper to format score details
const renderScoreDetail = (detail: ScoreDetail) => {
  const color = detail.met ? 'text-green-600' : 'text-red-600';
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
    isLoading,
    error,
    recommendation, // Keep recommendation if still used
    recommendationReasons,
  } = props;

  const timeStr = time ? new Date(time).toLocaleString('zh-CN', { hour12: false }) : '--';

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">加载中...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">错误: {error.message || JSON.stringify(error)}</div>;
  }

  // Helper to format score details - Adjusted for dark mode text
  const renderScoreDetail = (detail: ScoreDetail) => {
    const color = detail.met ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
    const symbol = detail.met ? '✓' : '✗';
    return (
      <li key={detail.condition} className={`flex justify-between ${color}`}>
        <span>{symbol} {detail.condition}</span>
        <span>({detail.met ? `+${detail.score}` : '+0'})</span>
      </li>
    );
  };

  return (
    // Add dark mode classes for background, border, text
    <div className="p-4 rounded border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow max-w-3xl mx-auto mt-6 space-y-4 text-gray-900 dark:text-gray-100">
      {/* Top Info */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 border-b pb-2 border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">数据时间: {timeStr}</div>
        <div className="text-xl font-semibold text-black dark:text-white">
          当前价格: ${price?.toFixed(2) ?? '--'}
        </div>
        {/* Adjust trend colors for dark mode if needed */}
        <div className={`text-sm ${indicators_15m?.ema15 && price && price > indicators_15m.ema15 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          15m趋势: {opening_signal?.ema15m_trend ?? '--'} (EMA15: ${indicators_15m?.ema15?.toFixed(2) ?? '--'})
        </div>
      </div>

      {/* Recommendation (If still used) */}
      {recommendation && (
        <div className="p-3 rounded bg-gray-100 dark:bg-gray-700">
          <div className="text-sm font-semibold mb-1 text-gray-800 dark:text-gray-200">📌 当前建议</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{recommendation}</div>
          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mt-1">
            {recommendationReasons?.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* Position Info & Holdability Score */}
      {position && (
        <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50">
          <div className="font-semibold mb-2 text-blue-800 dark:text-blue-300">当前持仓信息 & 扛单评分</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-2 text-gray-700 dark:text-gray-300">
            <div>方向: <span className={`font-bold ${position.side === 'long' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{position.side === 'long' ? '多头' : '空头'}</span></div>
            <div>开仓价: ${position.entryPrice?.toFixed(2) ?? '--'}</div>
            <div>强平价: ${position.liquidationPrice?.toFixed(2) ?? 'N/A'}</div>
          </div>
          <div className="flex items-center mb-1 text-gray-800 dark:text-gray-200">
            <div className="font-semibold mr-2">扛单能力评分:</div>
            {/* Adjust score colors for dark mode */}
            <div className={`text-xl font-bold ${holdability_score === null ? 'text-gray-500 dark:text-gray-400' : holdability_score >= 6 ? 'text-green-600 dark:text-green-400' : holdability_score >= 4 ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
              {holdability_score ?? 'N/A'} / 9
            </div>
          </div>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {holdability_details?.map(renderScoreDetail)}
          </ul>
        </div>
      )}

      {/* Opening Signal Score */}
      <div className="p-3 rounded bg-gray-50 dark:bg-gray-700/50">
        <div className="font-semibold mb-2 text-gray-800 dark:text-gray-200">开仓信号评分 (Max: 10)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Long Score Details */}
          <div>
            <div className="flex items-center mb-1 text-gray-800 dark:text-gray-200">
              <div className="font-semibold mr-2">📈 多头评分:</div>
               {/* Adjust score colors for dark mode */}
              <div className={`text-lg font-bold ${opening_signal?.long_score === null ? 'text-gray-500 dark:text-gray-400' : opening_signal?.long_score >= 6 ? 'text-green-600 dark:text-green-400' : opening_signal?.long_score >= 4 ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                 {opening_signal?.long_score ?? '--'}
              </div>
            </div>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {opening_signal?.long_details?.map(renderScoreDetail)}
            </ul>
          </div>
          {/* Short Score Details */}
          <div>
             <div className="flex items-center mb-1 text-gray-800 dark:text-gray-200">
              <div className="font-semibold mr-2">📉 空头评分:</div>
               {/* Adjust score colors for dark mode */}
              <div className={`text-lg font-bold ${opening_signal?.short_score === null ? 'text-gray-500 dark:text-gray-400' : opening_signal?.short_score >= 6 ? 'text-red-600 dark:text-red-400' : opening_signal?.short_score >= 4 ? 'text-yellow-500 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                 {opening_signal?.short_score ?? '--'}
              </div>
            </div>
             <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {opening_signal?.short_details?.map(renderScoreDetail)}
            </ul>
          </div>
        </div>
         {/* Optional: Display opening signal reasons (High-level summary) */}
         {/* <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
           <p>多头理由: {opening_signal?.long_reasons?.join('; ') || '无'}</p>
           <p>空头理由: {opening_signal?.short_reasons?.join('; ') || '无'}</p>
         </div> */}
      </div>

      {/* Key Indicators Display */}
      <div className="p-3 rounded bg-gray-50 dark:bg-gray-700/50 text-xs">
         <div className="font-semibold mb-2 text-gray-800 dark:text-gray-200">关键指标 (1m)</div>
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
            {indicators_1m && Object.entries(indicators_1m).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                        {typeof value === 'number' ? value.toFixed(2) : value ?? '--'}
                    </span>
                </div>
            ))}
         </div>
      </div>

    </div>
  );
}
