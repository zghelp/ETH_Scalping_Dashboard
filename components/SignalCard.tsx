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

  return (
    <div className="p-4 rounded border bg-white shadow max-w-3xl mx-auto mt-6 space-y-4">
      {/* Top Info */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 border-b pb-2">
        <div className="text-sm text-gray-500">数据时间: {timeStr}</div>
        <div className="text-xl font-semibold text-black">
          当前价格: ${price?.toFixed(2) ?? '--'}
        </div>
        <div className={`text-sm ${indicators_15m?.ema15 && price && price > indicators_15m.ema15 ? 'text-green-600' : 'text-red-600'}`}>
          15m趋势: {opening_signal?.ema15m_trend ?? '--'} (EMA15: ${indicators_15m?.ema15?.toFixed(2) ?? '--'})
        </div>
      </div>

      {/* Recommendation (If still used) */}
      {recommendation && (
        <div className="p-3 rounded bg-gray-100">
          <div className="text-sm font-semibold mb-1">📌 当前建议</div>
          <div className="text-lg font-bold text-blue-600">{recommendation}</div>
          <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
            {recommendationReasons?.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* Position Info & Holdability Score */}
      {position && (
        <div className="p-3 rounded bg-blue-50 border border-blue-200">
          <div className="font-semibold mb-2 text-blue-800">当前持仓信息 & 扛单评分</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-2">
            <div>方向: <span className={`font-bold ${position.side === 'long' ? 'text-green-600' : 'text-red-600'}`}>{position.side === 'long' ? '多头' : '空头'}</span></div>
            <div>开仓价: ${position.entryPrice?.toFixed(2) ?? '--'}</div>
            <div>强平价: ${position.liquidationPrice?.toFixed(2) ?? 'N/A'}</div>
          </div>
          <div className="flex items-center mb-1">
            <div className="font-semibold mr-2">扛单能力评分:</div>
            <div className={`text-xl font-bold ${holdability_score === null ? 'text-gray-500' : holdability_score >= 6 ? 'text-green-600' : holdability_score >= 4 ? 'text-yellow-600' : 'text-red-600'}`}>
              {holdability_score ?? 'N/A'} / 9
            </div>
          </div>
          <ul className="text-xs text-gray-600 space-y-1">
            {holdability_details?.map(renderScoreDetail)}
          </ul>
        </div>
      )}

      {/* Opening Signal Score */}
      <div className="p-3 rounded bg-gray-50">
        <div className="font-semibold mb-2 text-gray-800">开仓信号评分</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
          <div>📈 多头评分: {opening_signal?.long_score ?? '--'}</div>
          <div>📉 空头评分: {opening_signal?.short_score ?? '--'}</div>
        </div>
         {/* Optional: Display opening signal reasons */}
         {/* <div className="text-xs text-gray-600">
           <p>多头理由: {opening_signal?.long_reasons?.join(', ') || '无'}</p>
           <p>空头理由: {opening_signal?.short_reasons?.join(', ') || '无'}</p>
         </div> */}
      </div>

      {/* Key Indicators Display */}
      <div className="p-3 rounded bg-gray-50 text-xs">
         <div className="font-semibold mb-2 text-gray-800">关键指标 (1m)</div>
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
            {indicators_1m && Object.entries(indicators_1m).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                    <span className="text-gray-600">{key}:</span>
                    <span className="font-medium text-gray-800">
                        {typeof value === 'number' ? value.toFixed(2) : value ?? '--'}
                    </span>
                </div>
            ))}
         </div>
      </div>

    </div>
  );
}
