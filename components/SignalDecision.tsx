'use client'
import { useEffect, useState } from 'react'; // Keep useEffect/useState for decision state
import type { PositionInfoFromAPI } from '@/lib/types'; // Import Position type

// Use actual position side or '空仓'
type ActualPositionStatus = '空仓' | 'long' | 'short';

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

// Update Props to accept actual position data
type Props = {
  long: SignalSummary;
  short: SignalSummary;
  position: PositionInfoFromAPI | null; // Accept actual position from API
};

export default function SignalDecision({ long, short, position }: Props) {
  // Decision state remains, but position state is removed
  const [decision, setDecision] = useState<Recommendation>({ action: '加载中...', reasons: [] });

  // Determine actual position status from props
  const actualPositionStatus: ActualPositionStatus = position ? position.side : '空仓';

  useEffect(() => {
    // Generate recommendation based on actual position status
    setDecision(generateRecommendation(actualPositionStatus, long, short));
  }, [actualPositionStatus, long, short]); // Depend on actual status

  // Map actual status for display
  const displayStatus = actualPositionStatus === 'long' ? '持多' : actualPositionStatus === 'short' ? '持空' : '空仓';

  return (
    <div className="text-gray-900 dark:text-gray-100">
      {/* Recommendation Box - Adjusted Dark Mode Colors */}
      <div className="p-4 border rounded bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 my-6"> {/* Use solid dark bg */}
         <div className="flex justify-between items-center mb-2">
             <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100">✅ 建议操作</h3> {/* Brighter heading */}
             <span className="text-sm font-medium text-gray-600 dark:text-gray-300"> {/* Slightly brighter status text */}
                 (基于实际持仓: <span className={`font-bold ${actualPositionStatus === 'long' ? 'text-green-500 dark:text-green-400' : actualPositionStatus === 'short' ? 'text-red-500 dark:text-red-400' : 'dark:text-gray-300'}`}>{displayStatus}</span>)
             </span>
         </div>
        <p className="font-semibold text-blue-600 dark:text-blue-300">{decision.action}</p> {/* Brighter blue */}
        <ul className="list-disc list-inside mt-1 text-sm text-gray-600 dark:text-gray-200"> {/* Brighter list text */}
          {decision.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}

// Update function signature to accept ActualPositionStatus
function generateRecommendation(positionStatus: ActualPositionStatus, long: SignalSummary, short: SignalSummary): Recommendation {
  const openLongThreshold = 6; // Example threshold for opening long
  const openShortThreshold = 6; // Example threshold for opening short
  // holdThreshold is not used in this simplified logic yet

  if (positionStatus === '空仓') {
    if (long.score >= openLongThreshold && long.score > short.score) {
      return { action: '建议开多', reasons: long.reasons };
    }
    if (short.score >= openShortThreshold && short.score > long.score) {
      return { action: '建议开空', reasons: short.reasons };
    }
    return { action: '建议观望', reasons: ['开仓信号分数不足'] };
  }

  if (positionStatus === 'long') { // Check actual 'long' status
    // Simplified: If short signal is strong, suggest closing. Otherwise hold.
    if (short.score >= openShortThreshold) {
      return { action: '建议平多仓 (空头信号增强)', reasons: short.reasons };
    }
    // TODO: Integrate holdability score here for better hold/close decision
    return { action: '建议持有/待定 (多)', reasons: ['暂无强烈平仓信号'] }; // Placeholder
  }

  if (positionStatus === 'short') { // Check actual 'short' status
    // Simplified: If long signal is strong, suggest closing. Otherwise hold.
    if (long.score >= openLongThreshold) {
      return { action: '建议平空仓 (多头信号增强)', reasons: long.reasons };
    }
    // TODO: Integrate holdability score here for better hold/close decision
    return { action: '建议持有/待定 (空)', reasons: ['暂无强烈平仓信号'] }; // Placeholder
  }

  // Should not be reached if positionStatus is one of the three values
  return { action: '状态错误', reasons: ['无法识别的持仓状态'] };
}
