import type { NextApiRequest, NextApiResponse } from 'next';
import { FuturesApi, ApiClient } from 'gate-api';

// Initialize Gate.io API Client (Ensure environment variables are set)
const client = new ApiClient();
client.setApiKeySecret(process.env.GATE_READ_API_KEY!, process.env.GATE_READ_API_SECRET!);
const futuresApi = new FuturesApi(client);
const settle = 'usdt'; // Settle currency
const contract = 'ETH_USDT'; // Contract identifier

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("Fetching futures trades for:", contract);
    // Fetch the latest 100 trades for the specified contract
    // You might need to adjust parameters like 'limit' or add 'offset'/'from'/'to' for pagination/time range
    const options = {
        contract: contract,
        limit: 100, // Get latest 100 trades
        // offset: 0, // For pagination
        // from: undefined, // Start timestamp (optional)
        // to: undefined, // End timestamp (optional)
    };
    // Corrected call signature: listFuturesTrades(settle, contract, options)
    const result = await futuresApi.listFuturesTrades(settle, contract, options);
    console.log(`Successfully fetched ${result.body.length} trades.`);

    // Return the list of trades
    res.status(200).json(result.body);

  } catch (error: any) {
    console.error("Error fetching futures trades from Gate.io:", error);
    let errorMsg = 'Failed to fetch trades';
    let statusCode = 500;

    // Try to extract more specific error info from Gate.io response
    if (error.response?.body?.label) {
        errorMsg = `Gate.io API Error: ${error.response.body.label} - ${error.response.body.message}`;
        statusCode = error.status || 500; // Use status from error if available
    } else if (error.message) {
        errorMsg = error.message;
        statusCode = error.status || 500;
    }

    res.status(statusCode).json({ error: errorMsg, details: error.toString() });
  }
}
