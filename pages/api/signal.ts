// eth-scalping-dashboard 项目入口代码
// 文件：pages/api/signal.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCandlesFromGateIO } from '@/lib/gateio';
import { calculateIndicators } from '@/lib/indicators';
import { getStrategyScore } from '@/lib/score';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const candles = await getCandlesFromGateIO();
    const enriched = calculateIndicators(candles);
    const signal = getStrategyScore(enriched);
    res.status(200).json(signal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch signal' });
  }
}
