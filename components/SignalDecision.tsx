'use client'
import { useState, useEffect } from 'react'

type PositionStatus = '空仓' | '持多' | '持空'

type SignalSummary = {
  score: number
  signalTypes: string[]
  reasons: string[]
}

type Recommendation = {
  action: string
  reasons: string[]
  level?: string
}

type Props = {
  long: SignalSummary
  short: SignalSummary
}

export default function SignalDecision({ long, short }: Props) {
  const [position, setPosition] = useState<PositionStatus>('空仓')
  const [decision, setDecision] = useState<Recommendation>({ action: '加载中...', reasons: [] })

  useEffect(() => {
    setDecision(generateRecommendation(position, long, short))
  }, [position, long, short])

  return (
    <div>
      <div className="p-4 rounded border my-6 bg-white">
        <h2 className="text-lg font-semibold mb-2">📌 当前持仓状态</h2>
        <div className="flex space-x-2 mb-4">
          {(['空仓', '持多', '持空'] as PositionStatus[]).map((status) => (
            <button
              key={status}
              className={`px-4 py-2 rounded ${position === status ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setPosition(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 border rounded bg-gray-50">
        <h3 className="text-md font-semibold">✅ 建议操作：{decision.action}</h3>
        <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
          {decision.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  )  
}

function generateRecommendation(position: PositionStatus, long: SignalSummary, short: SignalSummary): Recommendation {
  if (position === '空仓') {
    if (long.signalTypes.includes('A') && long.score >= 5) return {
      action: '建议开多',
      reasons: long.reasons
    }
    if (short.signalTypes.includes('A') && short.score >= 5) return {
      action: '建议开空',
      reasons: short.reasons
    }
    return { action: '建议观望', reasons: ['暂无明显方向信号'] }
  }

  if (position === '持多') {
    if (long.signalTypes.includes('B')) return { action: '建议继续持有', reasons: long.reasons }
    if (long.signalTypes.includes('D')) return { action: '建议止盈', reasons: long.reasons }
    if (long.signalTypes.includes('E')) return { action: '建议止损', reasons: long.reasons }
  }

  if (position === '持空') {
    if (short.signalTypes.includes('B')) return { action: '建议继续持有空单', reasons: short.reasons }
    if (short.signalTypes.includes('D')) return { action: '建议空单止盈', reasons: short.reasons }
    if (short.signalTypes.includes('E')) return { action: '建议空单止损', reasons: short.reasons }
  }

  return { action: '暂无明确建议', reasons: ['信号不足或状态未知'] }
}