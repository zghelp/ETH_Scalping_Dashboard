import React from 'react'
import type { SignalProps } from '@/types'

export default function SignalCard(props: SignalProps) {
  const timeStr = props.time
    ? new Date(props.time).toLocaleString('zh-CN', { hour12: false })
    : '--'

  return (
    <div className="p-4 rounded border bg-white shadow max-w-2xl mx-auto mt-6">
      {/* 顶部信息 */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
        <div className="text-sm text-gray-500">数据时间：{timeStr}</div>
        <div className="text-xl font-semibold text-black">
          当前价格：${props.price?.toFixed(2) ?? '--'}
        </div>
      </div>

      {/* 策略建议 */}
      <div className="mb-4 p-3 rounded bg-gray-100">
        <div className="text-sm font-semibold mb-1">📌 当前建议</div>
        <div className="text-lg font-bold text-green-600">
          {props.recommendation ?? '建议生成中...'}
        </div>
        <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
          {props.recommendationReasons?.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* 评分与信号 */}
      <div className="text-sm">
        <div className="font-semibold mb-2">🎯 策略评分与信号明细</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
          <div>📈 多头评分：{props.long_score}</div>
          <div>📉 空头评分：{props.short_score}</div>
          <div>🎯 策略止盈价：${props.take_profit?.toFixed(2) ?? '--'}</div>
          <div>🚨 策略止损价：${props.stop_loss?.toFixed(2) ?? '--'}</div>
        </div>
      </div>
    </div>
  )
}
