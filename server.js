import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
} from "@solana/web3.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5500", "http://127.0.0.1:5500", "null"]; // "null" covers file://

app.use(
    cors({
        origin: (origin, cb) => {
            // Allow requests with no origin (curl, Postman, same-origin file://)
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin ${origin} not allowed`));
        },
    })
);
app.use(express.json());

// ── Solana connections ──────────────────────────────────────────────────────
// We keep one connection per cluster, created lazily as needed.
const connections = {};
function getConnection(cluster = "devnet") {
    if (!connections[cluster]) {
        const rpcUrl =
            cluster === "mainnet-beta"
                ? process.env.SOLANA_RPC_MAINNET || clusterApiUrl("mainnet-beta")
                : process.env.SOLANA_RPC_DEVNET || clusterApiUrl("devnet");
        connections[cluster] = new Connection(rpcUrl, "confirmed");
    }
    return connections[cluster];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function parseAddress(addressStr) {
    try {
        return new PublicKey(addressStr);
    } catch {
        return null;
    }
}

function clusterFromQuery(req) {
    const c = req.query.cluster;
    return c === "mainnet-beta" ? "mainnet-beta" : "devnet";
}

// ── Simple in-memory price cache (30-second TTL) ────────────────────────────
const priceCache = { data: null, fetchedAt: 0 };
const PRICE_TTL_MS = 30_000;

async function fetchSolPrice() {
    const now = Date.now();
    if (priceCache.data && now - priceCache.fetchedAt < PRICE_TTL_MS) {
        return priceCache.data;
    }
    const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
        { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
    const json = await res.json();
    priceCache.data = {
        usd: json.solana.usd,
        change24h: json.solana.usd_24h_change,
    };
    priceCache.fetchedAt = now;
    return priceCache.data;
}

// ════════════════════════════════════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════════════════════════════════════

// GET /api/health
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── GET /api/validate/:address ───────────────────────────────────────────────
// Returns whether the address is a valid Solana public key.
app.get("/api/validate/:address", (req, res) => {
    const pubkey = parseAddress(req.params.address);
    res.json({ valid: !!pubkey, address: req.params.address });
});

// ── GET /api/balance/:address?cluster=devnet|mainnet-beta ───────────────────
// Returns SOL balance and lamports for the given address.
app.get("/api/balance/:address", async (req, res) => {
    const pubkey = parseAddress(req.params.address);
    if (!pubkey) {
        return res.status(400).json({ error: "Invalid Solana address." });
    }
    try {
        const cluster = clusterFromQuery(req);
        const connection = getConnection(cluster);
        const lamports = await connection.getBalance(pubkey);
        const sol = lamports / LAMPORTS_PER_SOL;

        // Optionally enrich with USD value
        let usdValue = null;
        try {
            const price = await fetchSolPrice();
            usdValue = (sol * price.usd).toFixed(2);
        } catch {
            // Price enrichment is best-effort
        }

        res.json({
            address: pubkey.toString(),
            cluster,
            lamports,
            sol: sol.toFixed(6),
            usdValue,
        });
    } catch (err) {
        console.error("[balance]", err);
        res.status(502).json({ error: "Failed to fetch balance from Solana RPC." });
    }
});

// ── GET /api/transactions/:address?cluster=…&limit=10 ───────────────────────
// Returns recent confirmed transactions with basic metadata.
app.get("/api/transactions/:address", async (req, res) => {
    const pubkey = parseAddress(req.params.address);
    if (!pubkey) {
        return res.status(400).json({ error: "Invalid Solana address." });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const cluster = clusterFromQuery(req);

    try {
        const connection = getConnection(cluster);

        // 1. Fetch confirmed signature list
        const signatures = await connection.getSignaturesForAddress(pubkey, {
            limit,
        });

        if (signatures.length === 0) {
            return res.json({ address: pubkey.toString(), cluster, transactions: [] });
        }

        // 2. Fetch full transaction details in one batch
        const sigs = signatures.map((s) => s.signature);
        const txDetails = await connection.getParsedTransactions(sigs, {
            maxSupportedTransactionVersion: 0,
        });

        // 3. Shape the response
        const transactions = signatures.map((sigInfo, i) => {
            const tx = txDetails[i];
            const meta = tx?.meta;
            const message = tx?.transaction?.message;

            // Determine SOL amount transferred to/from this address
            let solDelta = null;
            if (meta && message) {
                const accountKeys = message.accountKeys.map((k) =>
                    k.pubkey ? k.pubkey.toString() : k.toString()
                );
                const idx = accountKeys.indexOf(pubkey.toString());
                if (idx !== -1 && meta.preBalances && meta.postBalances) {
                    solDelta =
                        (meta.postBalances[idx] - meta.preBalances[idx]) / LAMPORTS_PER_SOL;
                }
            }

            return {
                signature: sigInfo.signature,
                slot: sigInfo.slot,
                blockTime: sigInfo.blockTime, // unix timestamp
                status: sigInfo.err ? "failed" : "success",
                fee: meta ? meta.fee / LAMPORTS_PER_SOL : null,
                solDelta: solDelta !== null ? parseFloat(solDelta.toFixed(6)) : null,
                explorerUrl: `https://explorer.solana.com/tx/${sigInfo.signature}${cluster !== "mainnet-beta" ? `?cluster=${cluster}` : ""
                    }`,
            };
        });

        res.json({ address: pubkey.toString(), cluster, transactions });
    } catch (err) {
        console.error("[transactions]", err);
        res
            .status(502)
            .json({ error: "Failed to fetch transactions from Solana RPC." });
    }
});

// ── GET /api/price ───────────────────────────────────────────────────────────
// Returns SOL/USD spot price with 24h change, cached for 30 s.
app.get("/api/price", async (_req, res) => {
    try {
        const price = await fetchSolPrice();
        res.json({
            symbol: "SOL",
            currency: "USD",
            ...price,
            cachedAt: new Date(priceCache.fetchedAt).toISOString(),
        });
    } catch (err) {
        console.error("[price]", err);
        res.status(502).json({ error: "Failed to fetch SOL price." });
    }
});

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found." });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error." });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Orbit backend listening on http://localhost:${PORT}`);
    console.log(`   Routes:`);
    console.log(`     GET /api/health`);
    console.log(`     GET /api/price`);
    console.log(`     GET /api/validate/:address`);
    console.log(`     GET /api/balance/:address?cluster=devnet`);
    console.log(`     GET /api/transactions/:address?cluster=devnet&limit=10`);
});
