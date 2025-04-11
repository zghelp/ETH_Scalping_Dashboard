import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';
import type { SignalProps } from '@/lib/types'; // Use SignalProps for data structure

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fetch recent keys (e.g., last 100 signals)
    // Vercel KV scan is limited, so fetching a fixed number might be better than time range for now
    // Keys are like "signal:<timestamp_ms>"
    console.log("Fetching keys with pattern 'signal:*'");
    const signalKeys = await kv.keys('signal:*');
    console.log(`Found ${signalKeys.length} keys:`, signalKeys); // Log found keys

    // Sort keys by timestamp (descending) to get the latest ones
    const sortedKeys = signalKeys
      .map(key => ({ key, timestamp: parseInt(key.split(':')[1], 10) }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // Get the latest N keys (e.g., 100)
    const latestKeys = sortedKeys.slice(0, 100).map(item => item.key);
    console.log(`Selected latest ${latestKeys.length} keys:`, latestKeys); // Log selected keys

    if (latestKeys.length === 0) {
      console.log("No keys selected, returning empty array.");
      return res.status(200).json([]); // Return empty array if no history
    }

    // Fetch data for the latest keys
    console.log("Fetching data for selected keys...");
    // Note: mget might be more efficient if fetching many keys
    const historyDataPromises = latestKeys.map(key => kv.get(key));
    const historyDataRaw = await Promise.all(historyDataPromises);
    console.log("Raw data fetched from KV:", historyDataRaw); // Log raw data

    // Parse the JSON strings and filter out any null/invalid entries
    let parseErrors = 0;
    // @vercel/kv automatically parses JSON, so just filter nulls/undefined
    const historyData: SignalProps[] = historyDataRaw
      .filter((item): item is SignalProps => {
          if (item === null || typeof item !== 'object') {
              console.warn("Filtered out invalid item from KV:", item);
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
