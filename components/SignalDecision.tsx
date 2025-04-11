'use client'
import { useEffect, useState } from 'react';
// Import types and the new recommendation function
import type { PositionInfoFromAPI, ScoreDetail } from '@/lib/types';
import {
    generateProfessionalRecommendation,
    type Recommendation, // Import Recommendation type
    type ActualPositionStatus, // Import ActualPositionStatus type
    type OpeningSignalSummary, // Import OpeningSignalSummary type
    type MarketContextSummary // Import MarketContextSummary type
} from '@/lib/recommendation'; // Import from the new file

// Update Props to accept all necessary data from the API response
type Props = {
  opening_signal: OpeningSignalSummary | null;
  holdability_score: number | null;
  holdability_details: ScoreDetail[] | null;
  position: PositionInfoFromAPI | null;
  market_context: MarketContextSummary | null;
};

// Remove the old generateRecommendation function from this file

export default function SignalDecision({ opening_signal, holdability_score, holdability_details, position, market_context }: Props) {
  // Decision state remains
  const [decision, setDecision] = useState<Recommendation>({ action: '加载中...', reasons: [] });

  // Determine actual position status from props
  const actualPositionStatus: ActualPositionStatus = position ? position.side : '空仓';

  useEffect(() => {
    // Generate recommendation based on actual position status and all data
    setDecision(generateProfessionalRecommendation(
        actualPositionStatus,
        opening_signal,
        holdability_score,
        holdability_details,
        market_context
    ));
  }, [actualPositionStatus, opening_signal, holdability_score, holdability_details, market_context]); // Depend on all relevant data

  // Map actual status for display
  const displayStatus = actualPositionStatus === 'long' ? '持多' : actualPositionStatus === 'short' ? '持空' : '空仓';

  return (
    <div className="text-gray-900 dark:text-gray-100">
      {/* Recommendation Box - No more manual selection */}
      <div className="p-4 border rounded bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 my-6">
         <div className="flex justify-between items-center mb-2">
             <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100">✅ 建议操作</h3>
             <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                 (基于实际持仓: <span className={`font-bold ${actualPositionStatus === 'long' ? 'text-green-500 dark:text-green-400' : actualPositionStatus === 'short' ? 'text-red-500 dark:text-red-400' : 'dark:text-gray-300'}`}>{displayStatus}</span>)
             </span>
         </div>
        <p className="font-semibold text-blue-600 dark:text-blue-300">{decision.action}</p>
        <ul className="list-disc list-inside mt-1 text-sm text-gray-600 dark:text-gray-200 space-y-1"> {/* Added space-y-1 */}
          {decision.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}
