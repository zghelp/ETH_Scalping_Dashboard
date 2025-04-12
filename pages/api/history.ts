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

    // Parse the JSON strings
    let parseErrors = 0;
    const historyData: SignalProps[] = historyStrings
        .map((item, index) => {
            try {
                // Ensure item is a string before parsing (zrange returns members directly)
                if (typeof item === 'string') {
                    return JSON.parse(item);
                } else {
                     console.warn(`Item at index ${index} from zrange was not a string:`, item);
                     return null;
                }
            } catch (e) {
                parseErrors++;
                console.error(`Error parsing history data from zrange at index ${index}:`, e);
                console.error(`Problematic raw item:`, item); // Log the item that failed parsing
                return null;
            }
        })
        .filter((item): item is SignalProps => item !== null); // Type guard to filter nulls

    console.log(`Successfully parsed ${historyData.length} history items. Encountered ${parseErrors} parsing errors.`);
    res.status(200).json(historyData);

  } catch (error: any) {
    console.error("Error fetching history from Vercel KV:", error);
    res.status(500).json({ error: 'Failed to fetch signal history', details: error.message });
  }
}
