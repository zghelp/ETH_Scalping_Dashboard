import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';
import type { SignalProps } from '@/lib/types'; // Use SignalProps for data structure

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("Scanning keys with pattern 'signal:*'");
    const allSignalKeys: string[] = [];
    // Use scanIterator to get all keys matching the pattern
    for await (const key of kv.scanIterator({ match: 'signal:*' })) {
      allSignalKeys.push(key);
    }
    console.log(`Found ${allSignalKeys.length} total keys.`);

    // Sort keys by timestamp (descending) to get the latest ones
    const sortedKeysData = allSignalKeys
      .map(key => {
          const timestampStr = key.split(':')[1];
          // Add basic validation for timestamp parsing
          if (!timestampStr) return null;
          const timestamp = parseInt(timestampStr, 10);
          return !isNaN(timestamp) ? { key, timestamp } : null;
      })
      .filter(item => item !== null) // Filter out keys with invalid timestamps or format
      .sort((a, b) => b!.timestamp - a!.timestamp); // Sort valid items

    // Get the latest N keys (Reduce further to 20 to avoid timeout)
    const latestKeys = sortedKeysData.slice(0, 20).map(item => item!.key);
    console.log(`Selected latest ${latestKeys.length} keys:`, latestKeys);

    if (latestKeys.length === 0) {
      console.log("No valid keys selected, returning empty array.");
      return res.status(200).json([]);
    }

    // Fetch data for the latest keys using mget
    console.log("Fetching data for selected keys using mget...");
    // Use generic type <(SignalProps | null)[]> for mget result
    const historyDataObjects = await kv.mget<(SignalProps | null)[]>(...latestKeys);
    console.log(`Raw data fetched from KV via mget (count: ${historyDataObjects.length}):`, historyDataObjects);

    // Filter out any null results (e.g., key expired between scan and mget, or failed parse previously)
    const historyData: SignalProps[] = historyDataObjects.filter((item): item is SignalProps => item !== null);

    console.log(`Retrieved ${historyData.length} valid history items from KV.`);
    res.status(200).json(historyData);

  } catch (error: any) {
    console.error("Error fetching history from Vercel KV:", error);
    res.status(500).json({ error: 'Failed to fetch signal history', details: error.message });
  }
}
