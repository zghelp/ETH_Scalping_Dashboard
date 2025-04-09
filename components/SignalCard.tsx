import React from 'react'

interface SignalProps {
  time: number
  price: number
  score: number
  recommendation: string
  take_profit: number
  stop_loss: number
  reasons: string[]
}

export default function SignalCard(props: SignalProps) {
  const timeStr = new Date(props.time).toLocaleString('zh-CN', { hour12: false })

  return (
    <div className="w-full max-w-xl bg-white rounded-lg shadow-md p-5">
      <p className="text-sm text-gray-400">🕒 更新时间：{timeStr}</p>
      <div className="mt-2 flex justify-between items-center">
        <p className="text-xl font-semibold">当前价格：${props.price.toFixed(2)}</p>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${getColor(props.recommendation)}`}>
          {props.recommendation}
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-700">📊 策略评分：{props.score}/8</div>

      <div className="mt-3 text-sm text-gray-700">
        <p>🎯 建议止盈：<strong>${props.take_profit}</strong></p>
        <p>🛡️ 建议止损：<strong>${props.stop_loss}</strong></p>
      </div>

      <div className="mt-4">
        <p className="font-semibold text-gray-800">📌 信号明细：</p>
        <ul className="list-disc pl-5 text-sm mt-1 text-gray-600 space-y-1">
          {props.reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function getColor(rec: string) {
  if (rec === '做多') return 'bg-green-500'
  if (rec === '做空') return 'bg-red-500'
  return 'bg-gray-500'
}
