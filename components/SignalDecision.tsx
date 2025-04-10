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

// TODO: Refine recommendation logic based on new scoring system and signal types ('Trend', 'Breakout', etc.)
// For now, use a simplified score-based logic to avoid build errors due to type mismatch.
function generateRecommendation(position: PositionStatus, long: SignalSummary, short: SignalSummary): Recommendation {
  const openLongThreshold = 6; // Example threshold for opening long
  const openShortThreshold = 6; // Example threshold for opening short
  const holdThreshold = 4; // Example threshold for holding

  if (position === '空仓') {
    if (long.score >= openLongThreshold && long.score > short.score) {
        return { action: '建议开多', reasons: long.reasons };
    }
    if (short.score >= openShortThreshold && short.score > long.score) {
        return { action: '建议开空', reasons: short.reasons };
    }
    return { action: '建议观望', reasons: ['开仓信号分数不足'] };
  }

  if (position === '持多') {
    // Simplified: If short signal is strong, suggest closing. Otherwise hold.
    if (short.score >= openShortThreshold) {
         return { action: '建议平多仓 (空头信号增强)', reasons: short.reasons };
    }
    // Add logic based on holdability score if available/passed here?
    return { action: '建议持有/待定', reasons: ['暂无强烈平仓信号'] }; // Placeholder
  }

  if (position === '持空') {
     // Simplified: If long signal is strong, suggest closing. Otherwise hold.
     if (long.score >= openLongThreshold) {
         return { action: '建议平空仓 (多头信号增强)', reasons: long.reasons };
     }
     // Add logic based on holdability score if available/passed here?
     return { action: '建议持有/待定', reasons: ['暂无强烈平仓信号'] }; // Placeholder
  }

  return { action: '暂无明确建议', reasons: ['信号不足或状态未知'] };
}
