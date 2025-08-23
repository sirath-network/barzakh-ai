const APTOS_GRAPHQL_ENDPOINT =
  "https://indexer.mainnet.aptoslabs.com/v1/graphql";

// Utility function for making GraphQL requests with timeout and retry
async function fetchGraphQL(
  query: string, 
  variables: Record<string, any>,
  timeout = 300000, // 5 min
  retries = 2
): Promise<any> {
  const apiKey = process.env.APTOS_API_KEY;
  if (!apiKey) {
    throw new Error("APTOS_API_KEY not found in environment variables.");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} of ${retries + 1}`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(APTOS_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Origin": process.env.NODE_ENV === 'production' 
            ? "https://chat.barzakh.tech" 
            : "http://localhost:3000",
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal, // Add abort signal
      });

      clearTimeout(timeoutId); // Clear timeout if request completes

      const json = await response.json();

      if (!response.ok || json.errors) {
        // Check if it's a timeout error that we should retry
        const isTimeoutError = json.errors?.some((error: any) => 
          error.message?.includes("Request Timed Out") || 
          error.extensions?.code === "408"
        );
        
        if (isTimeoutError && attempt < retries) {
          console.log(`Timeout error, retrying in ${(attempt + 1) * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
          continue;
        }
        
        throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
      }

      return json.data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`Request timed out after ${timeout}ms`);
        if (attempt < retries) {
          console.log(`Retrying in ${(attempt + 1) * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
          continue;
        }
        throw new Error(`Request timed out after ${retries + 1} attempts`);
      }
      
      console.error(`Error fetching data (attempt ${attempt + 1}): ${error}`);
      
      if (attempt < retries) {
        console.log(`Retrying in ${(attempt + 1) * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
        continue;
      }
      
      throw error;
    }
  }
}

// 1️⃣ Get Transaction Block Number
export async function getPortfolio(address: string, limit = 10, offset = 0) {
  console.log("Fetching portfolio for address:", address);
  
  try {
    // Fetch in parallel but with smaller limits to reduce timeout risk
    const [ownedTokens, ownedCoins] = await Promise.allSettled([
      getOwnedTokens(address, Math.min(limit, 10), offset),
      getOwnedCoinsData(address, Math.min(limit, 20), offset)
    ]);

    return {
      ownedTokens: ownedTokens.status === 'fulfilled' ? ownedTokens.value : null,
      ownedCoins: ownedCoins.status === 'fulfilled' ? ownedCoins.value : null,
      errors: {
        tokensError: ownedTokens.status === 'rejected' ? ownedTokens.reason : null,
        coinsError: ownedCoins.status === 'rejected' ? ownedCoins.reason : null,
      }
    };
  } catch (error) {
    console.error("Error in getPortfolio:", error);
    throw error;
  }
}

export async function getAccountTransactionsData(
  address: string,
  limit = 25,
  offset = 0
) {
  console.log("Fetching transactions for address:", address);
  const query = `
    query AccountTransactionsData($address: String, $limit: Int, $offset: Int) {
      account_transactions(
        where: {account_address: {_eq: $address}}
        order_by: {transaction_version: desc}
        limit: $limit
        offset: $offset
      ) {
        transaction_version
        __typename
      }
    }
  `;
  
  try {
    const data = await fetchGraphQL(query, { address, limit, offset });
    
    // Add explorer links to the returned data
    if (data?.account_transactions && Array.isArray(data.account_transactions)) {
      data.account_transactions = data.account_transactions.map((tx: any) => ({
        ...tx,
        explorer_link: `https://explorer.aptoslabs.com/txn/${tx.transaction_version}?network=mainnet`,
        formatted_link: `[Transaction ${tx.transaction_version}](https://explorer.aptoslabs.com/txn/${tx.transaction_version}?network=mainnet)`
      }));
      
      console.log(`Added explorer links to ${data.account_transactions.length} transactions`);
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    throw error;
  }
}

// Get Count of Fungible Assets
export async function getFungibleAssetCount(address: string) {
  console.log("Fetching fungible asset count for address:", address);
  const query = `
    query GetFungibleAssetCount($address: String) {
      current_fungible_asset_balances_aggregate(
        where: {owner_address: {_eq: $address}}
      ) {
        aggregate {
          count
        }
      }
    }
  `;
  return await fetchGraphQL(query, { address });
}

// Get Count of Tokens Held
export async function getAccountTokensCount(address: string) {
  console.log("Fetching token count for address:", address);
  const query = `
    query getAccountTokensCount($where_condition: current_token_ownerships_v2_bool_exp) {
      current_token_ownerships_v2_aggregate(
        where: $where_condition
      ) {
        aggregate {
          count
        }
      }
    }
  `;
  const whereCondition = {
    owner_address: { _eq: address },
    amount: { _gt: "0" },
  };
  return await fetchGraphQL(query, { where_condition: whereCondition });
}

// Optimized coins query with better error handling
export async function getOwnedCoinsData(
  ownerAddress: string,
  limit = 20, // Reduced from 100
  offset = 0
) {
  console.log("Fetching coins data for address:", ownerAddress);
  
  // Simplified query to reduce load
  const query = `
    query CoinsData($owner_address: String, $limit: Int, $offset: Int) {
      current_fungible_asset_balances(
        where: {
          owner_address: {_eq: $owner_address}
          amount: {_gt: "0"}
        }
        order_by: {amount: desc}
        limit: $limit
        offset: $offset
      ) {
        amount
        asset_type
        metadata {
          name
          decimals
          symbol
        }
      }
    }
  `;
  
  try {
    const data = await fetchGraphQL(query, {
      owner_address: ownerAddress,
      limit,
      offset,
    }, 20000); // 20 second timeout for this query
    
    console.log("Coins data received:", data?.current_fungible_asset_balances?.length || 0, "items");
    
    if (!data?.current_fungible_asset_balances) {
      return [];
    }
    
    // Process the data
    const coinsData = data.current_fungible_asset_balances.map((coin: any) => {
      const { amount, metadata } = coin;
      const { decimals } = metadata;
      return {
        ...coin,
        amount: amount / Math.pow(10, decimals || 8), // Default to 8 decimals if not provided
      };
    });
    
    console.log("Processed coins data:", coinsData.length, "items");
    return coinsData;
  } catch (error) {
    console.error("Error fetching coins data:", error);
    throw error;
  }
}

// Optimized tokens query
export async function getOwnedTokens(address: string, limit = 10, offset = 0) {
  console.log("Fetching owned tokens for address:", address);
  
  const query = `
    query getOwnedTokens($where_condition: current_token_ownerships_v2_bool_exp!, $offset: Int, $limit: Int) {
      current_token_ownerships_v2(
        where: $where_condition
        order_by: {last_transaction_version: desc}
        offset: $offset
        limit: $limit
      ) {
        token_standard
        token_data_id
        amount
        current_token_data {
          token_name
          token_uri
        }
      }
    }
  `;
  
  const whereCondition = {
    owner_address: { _eq: address },
    amount: { _gt: 0 },
  };
  
  try {
    const data = await fetchGraphQL(query, {
      where_condition: whereCondition,
      offset,
      limit,
    }, 15000); // 15 second timeout
    
    console.log("Tokens data received:", data?.current_token_ownerships_v2?.length || 0, "items");
    return data;
  } catch (error) {
    console.error("Error fetching tokens data:", error);
    throw error;
  }
}

// 6️⃣ Get Token Data
export async function getTokenData(tokenDataId: string) {
  console.log("Fetching token data for token address:", tokenDataId);
  const query = `
    query getTokenData($where_condition: current_token_datas_v2_bool_exp) {
      current_token_datas_v2(
        where: $where_condition
      ) {
        token_name
        token_standard
        token_uri
      }
    }
  `;
  const whereCondition = {
    token_data_id: { _eq: tokenDataId },
  };
  return await fetchGraphQL(query, { where_condition: whereCondition });
}

// 7️⃣ Get Token Activity
export async function getTokenActivity(
  tokenDataId: string,
  limit = 20,
  offset = 0
) {
  console.log("Fetching token activity for token ID:", tokenDataId);
  const query = `
    query getTokenActivity($where_condition: token_activities_v2_bool_exp!) {
      token_activities_v2(
        where: $where_condition
        offset: $offset
        limit: $limit
      ) {
        transaction_version
        transaction_timestamp
        token_amount
      }
    }
  `;
  const whereCondition = {
    token_data_id: { _eq: tokenDataId },
  };
  return await fetchGraphQL(query, {
    where_condition: whereCondition,
    offset,
    limit,
  });
}

// 8️⃣ Get Transaction Balance Change
export async function getTransactionBalanceChange(txnVersion: string) {
  console.log(
    "Fetching transaction balance change for txn version:",
    txnVersion
  );
  const query = `
    query TransactionQuery($txn_version: String) {
      fungible_asset_activities(where: {transaction_version: {_eq: $txn_version}}) {
        amount
        asset_type
        owner_address
        transaction_timestamp
        transaction_version
      }
    }
  `;
  return await fetchGraphQL(query, { txn_version: txnVersion });
}
