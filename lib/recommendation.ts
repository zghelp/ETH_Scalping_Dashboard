import type { PositionInfoFromAPI, ScoreDetail } from './types';

// --- Types (Copied from SignalDecision.tsx and types.ts for self-containment) ---

// Use actual position side or '空仓'
export type ActualPositionStatus = '空仓' | 'long' | 'short';

// Define the structure for the opening signal part needed by the function
export interface OpeningSignalSummary {
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

// Define the structure for market context needed by the function
export interface MarketContextSummary {
    fng_value: number | null;
    fng_classification: string | null;
    btc_daily_trend: 'up' | 'down' | 'flat' | null;
    btc_daily_ema50: number | null;
}

// Define the structure for the recommendation result
export interface Recommendation {
  action: string;
  reasons: string[];
  level?: 'High' | 'Medium' | 'Low'; // Optional confidence level
}

// --- Professional Recommendation Logic ---
export function generateProfessionalRecommendation(
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
        // Return a specific state for loading/missing data
        return { action: '数据不足', reasons: ['等待信号数据...'] };
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
