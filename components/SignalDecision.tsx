'use client'
import { useEffect, useState } from 'react';
// Import necessary types from lib/types.ts
import type { PositionInfoFromAPI, SignalProps, ScoreDetail } from '@/lib/types';

// Use actual position side or '空仓'
type ActualPositionStatus = '空仓' | 'long' | 'short';

// Define the structure for the opening signal part passed as props
// (Extracted from SignalProps for clarity within this component)
interface OpeningSignalSummary {
  long_score: number;
  long_reasons?: string[];
  long_signalTypes?: string[];
  long_details?: ScoreDetail[];
  short_score: number;
  short_reasons?: string[];
  short_signalTypes?: string[];
  short_details?: ScoreDetail[];
  ema15m_trend?: 'up' | 'down' | 'flat';
}

// Define the structure for market context passed as props
interface MarketContextSummary {
    fng_value: number | null;
    fng_classification: string | null;
    btc_daily_trend: 'up' | 'down' | 'flat' | null;
    btc_daily_ema50: number | null;
}

// Define the structure for the recommendation result
interface Recommendation {
  action: string;
  reasons: string[];
  level?: 'High' | 'Medium' | 'Low'; // Optional confidence level
}

// Update Props to accept all necessary data from the API response
type Props = {
  opening_signal: OpeningSignalSummary | null;
  holdability_score: number | null;
  holdability_details: ScoreDetail[] | null;
  position: PositionInfoFromAPI | null;
  market_context: MarketContextSummary | null;
};

// --- Professional Recommendation Logic ---
function generateProfessionalRecommendation(
    positionStatus: ActualPositionStatus,
    openingSignal: OpeningSignalSummary | null,
    holdabilityScore: number | null,
    holdabilityDetails: ScoreDetail[] | null,
    marketContext: MarketContextSummary | null
): Recommendation {

    // --- Thresholds (can be adjusted) ---
    const openThreshold = 7; // Higher threshold for opening
    const strongCloseThreshold = 7; // Threshold for strong counter-signal suggesting immediate close
    const holdRiskThreshold = 5; // If holdability score is below this, consider closing

    const reasons: string[] = [];

    // --- Decision Logic ---

    // 1. Handle No Data Case
    if (!openingSignal || !marketContext) {
        return { action: '数据加载中...', reasons: ['等待信号数据...'] };
    }

    const { long_score, short_score, long_details, short_details, ema15m_trend } = openingSignal;
    const { btc_daily_trend, fng_value, fng_classification } = marketContext;

    // 2. Decision when Flat (空仓)
    if (positionStatus === '空仓') {
        const preferLong = btc_daily_trend === 'up';
        const preferShort = btc_daily_trend === 'down';
        const fngExtremeFear = fng_value !== null && fng_value < 25; // Example threshold
        const fngExtremeGreed = fng_value !== null && fng_value > 75; // Example threshold

        let openLongCondition = long_score >= openThreshold && long_score > short_score;
        let openShortCondition = short_score >= openThreshold && short_score > long_score;

        // Factor in BTC trend
        if (preferLong && !openLongCondition && long_score >= openThreshold -1) openLongCondition = true; // Slightly lower threshold if BTC trend aligns
        if (preferShort && !openShortCondition && short_score >= openThreshold -1) openShortCondition = true;

        // Factor in FNG (Be cautious opening against extreme sentiment)
        if (fngExtremeGreed && openLongCondition) reasons.push("注意：市场极度贪婪，谨慎追多");
        if (fngExtremeFear && openShortCondition) reasons.push("注意：市场极度恐惧，谨慎追空");
        // if (fngExtremeFear && openLongCondition) reasons.push("提示：可能存在恐慌性反弹机会"); // Optional contrarian hint

        if (openLongCondition) {
            reasons.unshift(...(long_details?.filter(d => d.met).map(d => d.condition) ?? [])); // Add reasons from details
            return { action: '建议：开多仓', reasons };
        }
        if (openShortCondition) {
             reasons.unshift(...(short_details?.filter(d => d.met).map(d => d.condition) ?? []));
            return { action: '建议：开空仓', reasons };
        }

        reasons.push("开仓评分未达阈值或方向不明");
        if (btc_daily_trend) reasons.push(`当前BTC日线趋势: ${btc_daily_trend}`);
        return { action: '建议：观望', reasons };
    }

    // 3. Decision when Holding Long (持多)
    if (positionStatus === 'long') {
        // Check for strong counter signal first
        if (short_score >= strongCloseThreshold) {
            reasons.push(`强空头信号出现 (评分: ${short_score})`);
            reasons.push(...(short_details?.filter(d => d.met).map(d => d.condition) ?? []));
            return { action: '建议：立即平多仓 (风险信号)', reasons };
        }
        // Check holdability score
        if (holdabilityScore !== null && holdabilityScore < holdRiskThreshold) {
            reasons.push(`扛单评分低 (${holdabilityScore}/9)`);
            // Add key reasons for low score
            holdabilityDetails?.filter(d => !d.met && d.score > 0).forEach(d => reasons.push(`风险: ${d.condition}`));
            return { action: '建议：考虑平多仓 (扛单风险高)', reasons };
        }
        // Otherwise, suggest holding / manage position
        reasons.push(`扛单评分: ${holdabilityScore ?? 'N/A'}/9`);
        if (holdabilityScore !== null && holdabilityScore >= holdRiskThreshold) {
             reasons.push("关键风险指标尚可");
        }
        reasons.push("关注移动止盈或保险线");
        return { action: '建议：继续持多 / 移止盈', reasons };
    }

    // 4. Decision when Holding Short (持空)
    if (positionStatus === 'short') {
        // Check for strong counter signal first
        if (long_score >= strongCloseThreshold) {
            reasons.push(`强多头信号出现 (评分: ${long_score})`);
             reasons.push(...(long_details?.filter(d => d.met).map(d => d.condition) ?? []));
            return { action: '建议：立即平空仓 (风险信号)', reasons };
        }
        // Check holdability score
        if (holdabilityScore !== null && holdabilityScore < holdRiskThreshold) {
            reasons.push(`扛单评分低 (${holdabilityScore}/9)`);
            holdabilityDetails?.filter(d => !d.met && d.score > 0).forEach(d => reasons.push(`风险: ${d.condition}`));
            return { action: '建议：考虑平空仓 (扛单风险高)', reasons };
        }
        // Otherwise, suggest holding / manage position
        reasons.push(`扛单评分: ${holdabilityScore ?? 'N/A'}/9`);
         if (holdabilityScore !== null && holdabilityScore >= holdRiskThreshold) {
             reasons.push("关键风险指标尚可");
        }
        reasons.push("关注移动止盈或保险线");
        return { action: '建议：继续持空 / 移止盈', reasons };
    }

    // Fallback
    return { action: '状态错误', reasons: ['无法识别的持仓状态'] };
}


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
