import { useState, useCallback } from 'react';
import { fetchTransactions } from '../api';

export function useTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const refresh = useCallback(async (address, cluster = 'devnet', limit = 10) => {
        if (!address) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTransactions(address, cluster, limit);
            setTransactions(data.transactions || []);
        } catch (err) {
            console.error('[useTransactions]', err);
            setError('Could not load transactions.');
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setTransactions([]);
        setError(null);
    }, []);

    return { transactions, loading, error, refresh, reset };
}
