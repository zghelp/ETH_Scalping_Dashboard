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
    const historyData: SignalProps[] = historyDataRaw
      .map((item, index) => { // Add index for logging context
        try {
          const parsed = typeof item === 'string' ? JSON.parse(item) : null;
          if (parsed === null && item !== null) { // Log if item was not null but parsing failed implicitly (e.g., not a string)
              console.warn(`Item at index ${index} (key: ${latestKeys[index]}) was not a string or null:`, item);
          }
          return parsed;
        } catch (e) {
          parseErrors++;
          console.error(`Error parsing history data from KV for key ${latestKeys[index]}:`, e);
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
