import { useState, useCallback } from 'react';
import { fetchBalance } from '../api';

export function useBalance() {
    const [sol, setSol] = useState(null);
    const [usdValue, setUsdValue] = useState(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async (address, cluster = 'devnet') => {
        if (!address) return;
        setLoading(true);
        try {
            const data = await fetchBalance(address, cluster);
            setSol(parseFloat(data.sol).toFixed(4));
            setUsdValue(data.usdValue);
        } catch (err) {
            console.error('[useBalance]', err);
            setSol(null);
            setUsdValue(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setSol(null);
        setUsdValue(null);
    }, []);

    return { sol, usdValue, loading, refresh, reset };
}
