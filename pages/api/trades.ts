import type { NextApiRequest, NextApiResponse } from 'next';
import { FuturesApi, ApiClient, FuturesTrade } from 'gate-api'; // Import FuturesTrade type

// Initialize Gate.io API Client (Ensure environment variables are set)
const client = new ApiClient();
client.setApiKeySecret(process.env.GATE_READ_API_KEY!, process.env.GATE_READ_API_SECRET!);
const futuresApi = new FuturesApi(client);
const settle = 'usdt'; // Settle currency
const contract = 'ETH_USDT'; // Contract identifier

// Define structure for aggregated trade
interface AggregatedTrade {
    createTimeMs: number; // Precise timestamp of the first trade in the group (ms)
    minuteTimestampMs: number; // Timestamp rounded down to the start of the minute (ms)
    contract: string;
    // orderId?: string; // Removed
    size: number; // Sum of sizes (positive for long, negative for short)
    avgPrice: number; // Volume-weighted average price
    role?: 'taker' | 'maker' | 'mixed'; // Role might be mixed
    tradeIds: number[]; // List of original trade IDs included
}


// Function to aggregate trades that happen close together (e.g., within 1 second)
function aggregateTrades(trades: FuturesTrade[]): AggregatedTrade[] {
    if (!trades || trades.length === 0) {
        return [];
    }

    // Sort by time first to ensure proper grouping
    const sortedTrades = trades.sort((a, b) => (a.createTimeMs ?? a.createTime ?? 0) - (b.createTimeMs ?? b.createTime ?? 0));

    const aggregated: AggregatedTrade[] = [];
    let currentGroup: FuturesTrade[] = [];
    const aggregationWindowMs = 1000; // Aggregate trades within 1 second of each other

    for (const trade of sortedTrades) {
        const tradeTimeMs = trade.createTimeMs ?? (trade.createTime ? trade.createTime * 1000 : null);
        if (!tradeTimeMs || trade.price === undefined || trade.size === undefined) continue; // Skip invalid trades

        if (currentGroup.length === 0) {
            currentGroup.push(trade);
        } else {
            const firstTradeInGroupTimeMs = currentGroup[0].createTimeMs ?? (currentGroup[0].createTime ? currentGroup[0].createTime * 1000 : null);
            // Check if current trade is within the window of the *first* trade in the group
            if (firstTradeInGroupTimeMs && (tradeTimeMs - firstTradeInGroupTimeMs <= aggregationWindowMs)) {
                currentGroup.push(trade);
            } else {
                // Finalize the previous group
                const totalSize = currentGroup.reduce((sum, t) => sum + (t.size ?? 0), 0);
                const totalValue = currentGroup.reduce((sum, t) => sum + Math.abs(t.size ?? 0) * parseFloat(t.price ?? '0'), 0);
                const totalAbsSize = currentGroup.reduce((sum, t) => sum + Math.abs(t.size ?? 0), 0);
                const avgPrice = totalAbsSize > 0 ? totalValue / totalAbsSize : 0;
                // Correctly calculate integer MS timestamp from seconds (trade.createTime)
                const firstTradeTimeSeconds = currentGroup[0].createTime; // Use createTime (seconds)
                const firstTradeTimeMs = firstTradeTimeSeconds ? Math.floor(firstTradeTimeSeconds * 1000) : null; // Precise MS
                const minuteTimestampMs = firstTradeTimeMs ? Math.floor(firstTradeTimeMs / 60000) * 60000 : null; // Minute MS
                // Role logic already removed

                if (firstTradeTimeMs && minuteTimestampMs) { // Only add if we have valid times
                    aggregated.push({
                        createTimeMs: firstTradeTimeMs, // Assign precise MS timestamp
                        minuteTimestampMs: minuteTimestampMs, // Assign minute MS timestamp
                        contract: currentGroup[0].contract!,
                        // orderId: currentGroup[0].orderId, // Remove orderId
                        size: totalSize,
                        avgPrice: avgPrice,
                        // role: role, // Remove role
                        tradeIds: currentGroup.map(t => t.id!).filter(id => id !== undefined),
                    });
                }
                // Start a new group with the current trade
                currentGroup = [trade];
            }
        }
    }

     // Finalize the last group
     if (currentGroup.length > 0) {
        const totalSize = currentGroup.reduce((sum, t) => sum + (t.size ?? 0), 0);
        const totalValue = currentGroup.reduce((sum, t) => sum + Math.abs(t.size ?? 0) * parseFloat(t.price ?? '0'), 0);
        const totalAbsSize = currentGroup.reduce((sum, t) => sum + Math.abs(t.size ?? 0), 0);
        const avgPrice = totalAbsSize > 0 ? totalValue / totalAbsSize : 0;
        // Correctly calculate integer MS timestamp from seconds (trade.createTime)
        const firstTradeTimeSeconds = currentGroup[0].createTime; // Use createTime (seconds)
        const firstTradeTimeMs = firstTradeTimeSeconds ? Math.floor(firstTradeTimeSeconds * 1000) : null; // Precise MS
        const minuteTimestampMs = firstTradeTimeMs ? Math.floor(firstTradeTimeMs / 60000) * 60000 : null; // Minute MS
        // Role logic already removed

         if (firstTradeTimeMs && minuteTimestampMs) {
             aggregated.push({
                 createTimeMs: firstTradeTimeMs, // Assign precise MS timestamp
                 minuteTimestampMs: minuteTimestampMs, // Assign minute MS timestamp
                 contract: currentGroup[0].contract!,
                 // orderId: currentGroup[0].orderId, // Remove orderId
                 size: totalSize,
                 avgPrice: avgPrice,
                 // role: role, // Remove role
                 tradeIds: currentGroup.map(t => t.id!).filter(id => id !== undefined),
             });
         }
    }


    return aggregated;
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("Fetching futures trades for:", contract);
    const options = {
        contract: contract,
        limit: 1000, // Fetch more trades to increase chance of finding matches & for aggregation
    };
    const result = await futuresApi.listFuturesTrades(settle, contract, options);
    console.log(`Successfully fetched ${result.body.length} raw trades.`);

    // Aggregate the trades
    const aggregatedTrades = aggregateTrades(result.body);
    console.log(`Aggregated into ${aggregatedTrades.length} trade groups.`);

    // Return the aggregated list of trades
    res.status(200).json(aggregatedTrades);

  } catch (error: any) {
    console.error("Error fetching/aggregating futures trades from Gate.io:", error);
    let errorMsg = 'Failed to fetch trades';
    let statusCode = 500;

    if (error.response?.body?.label) {
        errorMsg = `Gate.io API Error: ${error.response.body.label} - ${error.response.body.message}`;
        statusCode = error.status || 500;
    } else if (error.message) {
        errorMsg = error.message;
        statusCode = error.status || 500;
    }

    res.status(statusCode).json({ error: errorMsg, details: error.toString() });
  }
}
