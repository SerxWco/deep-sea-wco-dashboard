// GraphQL service for W-Chain API
import { supabase } from '@/integrations/supabase/client';

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

interface Address {
  hash: string;
  coinBalance: string;
  transactionsCount: number;
  lastSeen?: string;
}

interface Transaction {
  hash: string;
  value: string;
  timestamp: string;
  from: {
    hash: string;
  };
  to: {
    hash: string;
  };
}

interface NetworkStatsQuery {
  addresses: {
    items: Address[];
    totalCount: number;
  };
  transactions: {
    items: Transaction[];
  };
  stats: {
    totalTransactionsCount: string;
    totalBlocksCount: string;
    averageBlockTime: string;
    totalAddresses: string;
  };
}

class WChainGraphQLService {
  private baseUrl: string;
  private graphqlEndpoint: string;

  constructor() {
    this.baseUrl = 'https://scan.w-chain.com';
    this.graphqlEndpoint = `${this.baseUrl}/api/graphql`; // Will use proxy
  }

  private async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const { data: result, error } = await supabase.functions.invoke('wchain-graphql-proxy', {
      body: {
        query,
        variables,
      }
    });

    if (error) {
      throw new Error(`GraphQL request failed: ${error.message}`);
    }

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL query');
    }

    return result.data;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Simple introspection query to test if GraphQL is available
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            types {
              name
            }
          }
        }
      `;
      
      await this.query(introspectionQuery);
      return true;
    } catch (error) {
      console.warn('GraphQL endpoint not available, falling back to REST:', error);
      return false;
    }
  }

  async getNetworkStats(limit: number = 5000): Promise<NetworkStatsQuery> {
    // Comprehensive query to get all network stats in one request
    const query = `
      query GetNetworkStats($addressLimit: Int!, $transactionLimit: Int!) {
        addresses(
          first: $addressLimit
          orderBy: COIN_BALANCE_DESC
        ) {
          items {
            hash
            coinBalance
            transactionsCount
            lastSeen
          }
          totalCount
        }
        
        transactions(
          first: $transactionLimit
          orderBy: TIMESTAMP_DESC
        ) {
          items {
            hash
            value
            timestamp
            from {
              hash
            }
            to {
              hash
            }
          }
        }
        
        stats {
          totalTransactionsCount
          totalBlocksCount
          averageBlockTime
          totalAddresses
        }
      }
    `;

    return this.query<NetworkStatsQuery>(query, {
      addressLimit: limit,
      transactionLimit: 2000,
    });
  }

  async getActiveWallets(hours: number = 24): Promise<{
    activeWallets: string[];
    transactions: Transaction[];
  }> {
    // Calculate timestamp for the time window
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const query = `
      query GetActiveWallets($since: DateTime!, $limit: Int!) {
        transactions(
          first: $limit
          orderBy: TIMESTAMP_DESC
          filter: { timestamp: { greaterThan: $since } }
        ) {
          items {
            hash
            value
            timestamp
            from {
              hash
            }
            to {
              hash
            }
          }
        }
      }
    `;

    const result = await this.query<{ transactions: { items: Transaction[] } }>(query, {
      since: timeAgo,
      limit: 2000,
    });

    // Extract unique wallet addresses from transactions
    const activeWalletsSet = new Set<string>();
    result.transactions.items.forEach(tx => {
      activeWalletsSet.add(tx.from.hash.toLowerCase());
      activeWalletsSet.add(tx.to.hash.toLowerCase());
    });

    return {
      activeWallets: Array.from(activeWalletsSet),
      transactions: result.transactions.items,
    };
  }

  async getHolderCount(minBalance: string = "1000000000000000000"): Promise<{
    totalHolders: number;
    holders: Address[];
  }> {
    const query = `
      query GetHolders($minBalance: String!, $limit: Int!) {
        addresses(
          first: $limit
          filter: { coinBalance: { greaterThanOrEqualTo: $minBalance } }
          orderBy: COIN_BALANCE_DESC
        ) {
          items {
            hash
            coinBalance
            transactionsCount
          }
          totalCount
        }
      }
    `;

    const result = await this.query<{ addresses: { items: Address[]; totalCount: number } }>(query, {
      minBalance,
      limit: 10000, // Get more accurate holder count
    });

    return {
      totalHolders: result.addresses.totalCount,
      holders: result.addresses.items,
    };
  }
}

// Create a singleton instance
export const wchainGraphQL = new WChainGraphQLService();

// Export types for use in other files
export type { Address, Transaction, NetworkStatsQuery };