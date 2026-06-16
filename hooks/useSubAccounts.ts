// hooks/useSubAccounts.ts
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface SubAccount {
    customerId: string;
    descriptiveName: string;
    manager: boolean;
    testAccount: boolean;
    currencyCode?: string;
    timeZone?: string;
}

export function useSubAccounts() {
    const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'loading') return; // Wait for session to load

        const fetchSubAccounts = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch('/api/sub-accounts');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch sub-accounts');
                }

                if (data.success) {
                    setSubAccounts(data.subAccounts);
                } else {
                    throw new Error(data.error || 'Failed to fetch sub-accounts');
                }
            } catch (err: any) {
                console.error('Error fetching sub-accounts:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSubAccounts();
    }, [status]);

    return { subAccounts, loading, error };
}