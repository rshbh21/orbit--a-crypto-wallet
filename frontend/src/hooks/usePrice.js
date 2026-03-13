import { useState, useEffect, useCallback } from 'react';
import { fetchPrice } from '../api';

export function usePrice() {
    const [price, setPrice] = useState(null);
    const [change24h, setChange24h] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const data = await fetchPrice();
            setPrice(data.usd);
            setChange24h(data.change24h);
        } catch (err) {
            console.warn('[usePrice]', err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 30_000);
        return () => clearInterval(id);
    }, [refresh]);

    return { price, change24h, loading };
}
