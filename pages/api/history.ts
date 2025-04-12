import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';
import type { SignalProps } from '@/lib/types'; // Use SignalProps for data structure

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sortedSetKey = 'signal_history';
  const count = 50; // Number of recent items to fetch (can adjust)

  try {
    console.log(`Fetching latest ${count} items from sorted set: ${sortedSetKey}`);

    // Fetch latest 'count' members (which are JSON strings) using zrange with rev:true
    // Scores (timestamps) are not needed here, just the members
    const historyStrings = await kv.zrange(sortedSetKey, 0, count - 1, { rev: true });

    console.log(`Retrieved ${historyStrings.length} items from sorted set.`);

    if (historyStrings.length === 0) {
        return res.status(200).json([]);
    }

    // @vercel/kv zrange already returns parsed objects (or null if parsing failed on their end)
    // Filter out any nulls or non-objects directly
    const historyData: SignalProps[] = historyStrings
        .filter((item): item is SignalProps => {
            if (item === null || typeof item !== 'object') {
                console.warn("Filtered out invalid item from KV zrange result:", item);
                return false;
            }
            // Optional: Add more checks if needed to ensure it matches SignalProps structure
            return true;
        });

    console.log(`Retrieved ${historyData.length} valid history items from KV.`);
    res.status(200).json(historyData);

  } catch (error: any) {
    console.error("Error fetching history from Vercel KV:", error);
    res.status(500).json({ error: 'Failed to fetch signal history', details: error.message });
  }
}
