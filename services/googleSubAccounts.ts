// services/googleSubAccounts.ts
import axios from "axios";

const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
// const MANAGER_ID = process.env.GOOGLE_MANAGER_ID!;

export interface SubAccount {
    customerId: string;
    descriptiveName: string;
    manager: boolean;
    testAccount: boolean;
    currencyCode?: string;
    timeZone?: string;
}

/**
 * Fetches all accessible customer accounts (sub-accounts) under the manager account
 */
export async function getSubAccounts(accessToken: string, MANAGER_ID: string): Promise<SubAccount[]> {
    try {
        if (!MANAGER_ID) {
            throw new Error("GOOGLE_MANAGER_ID environment variable is not set");
        }

        const normalizedManagerId = MANAGER_ID.replace(/-/g, '');
        const apiVersion = process.env.GOOGLE_ADS_API_VERSION || "v22";
        const url = `https://googleads.googleapis.com/${apiVersion}/customers/${normalizedManagerId}/googleAds:search`;

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': DEVELOPER_TOKEN,
            'Content-Type': 'application/json',
            'login-customer-id': normalizedManagerId,
        };

        // Query to get all accessible customers
        const query = `
      SELECT 
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.manager,
        customer_client.test_account,
        customer_client.currency_code,
        customer_client.time_zone
      FROM customer_client
      WHERE customer_client.status = 'ENABLED'
    `;

        console.log('[SubAccounts] Fetching accessible customers from manager:', normalizedManagerId);

        const response = await axios.post(url, { query }, {
            headers,
            timeout: 30000,
            validateStatus: (status) => status < 500 // Don't throw for 4xx errors
        });

        // Check for API errors
        if (response.status !== 200) {
            const errorData = response.data;
            console.error('[SubAccounts] API returned error: ', JSON.stringify(errorData));
            console.error('[SubAccounts] API returned error status:', response.status, errorData);
            throw new Error(`Google Ads API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
        }

        if (!response.data?.results) {
            console.warn('[SubAccounts] No accessible customers found in response');
            return [];
        }

        const subAccounts: SubAccount[] = response.data.results
            .map((result: any) => {
                const client = result.customerClient;
                if (!client?.clientCustomer) {
                    console.warn('[SubAccounts] Skipping customer with no clientCustomer:', client);
                    return null;
                }

                const customerId = client.clientCustomer.replace(/^customers\//, '');

                return {
                    customerId,
                    descriptiveName: client.descriptiveName || `Account ${customerId}`,
                    manager: client.manager || false,
                    testAccount: client.testAccount || false,
                    currencyCode: client.currencyCode,
                    timeZone: client.timeZone,
                };
            })
            .filter((account: SubAccount | null): account is SubAccount => account !== null);

        console.log(`[SubAccounts] Found ${subAccounts.length} accessible customers`);

        // Add the manager account itself to the list if not already included
        const managerExists = subAccounts.some(acc => acc.customerId === normalizedManagerId);
        if (!managerExists) {
            const managerAccount: SubAccount = {
                customerId: normalizedManagerId,
                descriptiveName: "Manager Account",
                manager: true,
                testAccount: false,
            };
            subAccounts.unshift(managerAccount);
        }

        return subAccounts;

    } catch (error: any) {
        console.error('[SubAccounts] Error fetching sub-accounts:', error.response?.data || error.message);

        // Provide detailed error information
        if (error.response?.data?.error) {
            const apiError = error.response.data.error;
            throw new Error(`Google Ads API Error (${apiError.status}): ${apiError.message}`);
        }

        if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout - Google Ads API is not responding');
        }

        throw new Error(`Failed to fetch sub-accounts: ${error.message}`);
    }
}

/**
 * Alternative method using the listAccessibleCustomers endpoint
 */
export async function getSubAccountsAlternative(accessToken: string): Promise<SubAccount[]> {
    try {
        const apiVersion = process.env.GOOGLE_ADS_API_VERSION || "v22";
        const url = `https://googleads.googleapis.com/${apiVersion}/customers:listAccessibleCustomers`;

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': DEVELOPER_TOKEN,
            'Content-Type': 'application/json',
        };

        console.log('[SubAccounts] Fetching accessible customers using alternative method...');

        const response = await axios.get(url, {
            headers,
            timeout: 30000,
            validateStatus: (status) => status < 500
        });

        if (response.status !== 200) {
            const errorData = response.data;
            console.error('[SubAccounts] Alternative method API error:', response.status, errorData);
            throw new Error(`Google Ads API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
        }

        if (!response.data?.resourceNames) {
            console.warn('[SubAccounts] No accessible customers found in alternative method');
            return [];
        }

        const subAccounts: SubAccount[] = response.data.resourceNames
            .map((resourceName: string) => {
                const customerId = resourceName.replace(/^customers\//, '');
                return {
                    customerId,
                    descriptiveName: `Account ${customerId}`,
                    manager: false,
                    testAccount: false,
                };
            })
            .filter((account: SubAccount) => account.customerId);

        console.log(`[SubAccounts] Alternative method found ${subAccounts.length} accessible customers`);
        return subAccounts;

    } catch (error: any) {
        console.error('[SubAccounts] Alternative method failed:', error.response?.data || error.message);
        throw error;
    }
}
