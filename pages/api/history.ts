import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';
import type { SignalProps } from '@/lib/types'; // Use SignalProps for data structure

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fetch recent keys (e.g., last 100 signals)
    // Vercel KV scan is limited, so fetching a fixed number might be better than time range for now
    // Keys are like "signal:<timestamp_ms>"
    const signalKeys = await kv.keys('signal:*');

    // Sort keys by timestamp (descending) to get the latest ones
    const sortedKeys = signalKeys
      .map(key => ({ key, timestamp: parseInt(key.split(':')[1], 10) }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // Get the latest N keys (e.g., 100)
    const latestKeys = sortedKeys.slice(0, 100).map(item => item.key);

    if (latestKeys.length === 0) {
      return res.status(200).json([]); // Return empty array if no history
    }

    // Fetch data for the latest keys
    // Note: mget might be more efficient if fetching many keys
    const historyDataPromises = latestKeys.map(key => kv.get(key));
    const historyDataRaw = await Promise.all(historyDataPromises);

    // Parse the JSON strings and filter out any null/invalid entries
    const historyData: SignalProps[] = historyDataRaw
      .map(item => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : null;
        } catch (e) {
          console.error("Error parsing history data from KV:", e);
          return null;
        }
      })
      .filter((item): item is SignalProps => item !== null); // Type guard to filter nulls

    res.status(200).json(historyData);

  } catch (error: any) {
    console.error("Error fetching history from Vercel KV:", error);
    res.status(500).json({ error: 'Failed to fetch signal history', details: error.message });
  }
}
