/**
 * api.js — thin fetch wrappers for all Orbit backend routes.
 * All routes are proxied via Vite dev server to http://localhost:3001
 */

const API_BASE = '/api';

async function apiFetch(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}

/**
 * GET /api/price
 * Returns { usd, change24h }
 */
export async function fetchPrice() {
    return apiFetch('/price');
}

/**
 * GET /api/balance/:address?cluster=…
 * Returns { sol, usdValue, address, cluster, lamports }
 */
export async function fetchBalance(address, cluster = 'devnet') {
    return apiFetch(`/balance/${encodeURIComponent(address)}?cluster=${cluster}`);
}

/**
 * GET /api/transactions/:address?cluster=…&limit=10
 * Returns { transactions: [...] }
 */
export async function fetchTransactions(address, cluster = 'devnet', limit = 10) {
    return apiFetch(
        `/transactions/${encodeURIComponent(address)}?cluster=${cluster}&limit=${limit}`
    );
}

/**
 * GET /api/validate/:address
 * Returns { valid: boolean }
 */
export async function validateAddress(address) {
    return apiFetch(`/validate/${encodeURIComponent(address)}`);
}
