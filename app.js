// Orbit Wallet – Solana web wallet UI using Phantom + @solana/web3.js
// Backend API base (change if you deploy the server elsewhere)
const API_BASE = "http://localhost:3001/api";

const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, clusterApiUrl } =
  solanaWeb3;

let connection = new Connection(clusterApiUrl("devnet"), "confirmed");
let currentCluster = "devnet";
let walletPublicKey = null;

const connectButton = document.getElementById("connectButton");
const connectionStatus = document.getElementById("connectionStatus");
const networkName = document.getElementById("networkName");
const walletAddress = document.getElementById("walletAddress");
const walletBalance = document.getElementById("walletBalance");
const walletBalanceUsd = document.getElementById("walletBalanceUsd");
const solPrice = document.getElementById("solPrice");
const solPriceChange = document.getElementById("solPriceChange");
const refreshButton = document.getElementById("refreshButton");
const switchDevnetButton = document.getElementById("switchDevnetButton");
const sendForm = document.getElementById("sendForm");
const sendToInput = document.getElementById("sendTo");
const sendAmountInput = document.getElementById("sendAmount");
const sendStatus = document.getElementById("sendStatus");
const txList = document.getElementById("txList");

// ── Utilities ─────────────────────────────────────────────────────────────

function setStatus(text, type = "info") {
  sendStatus.textContent = text;
  sendStatus.classList.remove("success", "error");
  if (type === "success") sendStatus.classList.add("success");
  if (type === "error") sendStatus.classList.add("error");
}

function getProvider() {
  if ("phantom" in window) {
    const p = window.phantom?.solana;
    if (p?.isPhantom) return p;
  }
  if ("solana" in window) return window.solana;
  return null;
}

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ── Price ticker ──────────────────────────────────────────────────────────

async function refreshPrice() {
  try {
    const data = await apiFetch("/price");
    if (solPrice) {
      solPrice.textContent = `$${data.usd.toFixed(2)}`;
    }
    if (solPriceChange) {
      const pct = data.change24h.toFixed(2);
      const positive = data.change24h >= 0;
      solPriceChange.textContent = `${positive ? "▲" : "▼"} ${Math.abs(pct)}%`;
      solPriceChange.classList.toggle("positive", positive);
      solPriceChange.classList.toggle("negative", !positive);
    }
  } catch (err) {
    console.warn("[price]", err.message);
  }
}

// Refresh price on load and every 30 s
refreshPrice();
setInterval(refreshPrice, 30_000);

// ── Wallet connection ──────────────────────────────────────────────────────

async function connectWallet() {
  const provider = getProvider();
  if (!provider) {
    alert("No Solana wallet extension found. Install Phantom (phantom.app) or Backpack to continue.");
    return;
  }
  try {
    connectButton.disabled = true;
    connectButton.textContent = "Connecting…";
    const resp = await provider.connect();
    walletPublicKey = resp.publicKey;
    connectionStatus.textContent = "Connected";
    connectionStatus.classList.remove("muted");
    connectButton.textContent = "Connected";
    connectButton.disabled = false;
    await refreshAccountInfo();
    await refreshTransactions();
  } catch (err) {
    console.error(err);
    connectionStatus.textContent = "Not connected";
    connectButton.textContent = "Connect Wallet";
    connectButton.disabled = false;
    if (err.code !== 4001) alert("Failed to connect wallet. Check your wallet extension.");
  }
}

// ── Account info (via backend) ─────────────────────────────────────────────

async function refreshAccountInfo() {
  if (!walletPublicKey) return;
  try {
    const addr = walletPublicKey.toString();
    const data = await apiFetch(`/balance/${addr}?cluster=${currentCluster}`);

    walletAddress.textContent = addr;
    walletAddress.classList.remove("muted");
    walletBalance.textContent = `${parseFloat(data.sol).toFixed(4)} SOL`;

    if (walletBalanceUsd && data.usdValue) {
      walletBalanceUsd.textContent = `≈ $${data.usdValue}`;
    }

    const clusterLabel =
      currentCluster === "mainnet-beta" ? "Solana Mainnet" :
        currentCluster === "devnet" ? "Devnet" : "Testnet";
    networkName.textContent = clusterLabel;
    networkName.classList.remove("muted");
  } catch (err) {
    console.error("[refreshAccountInfo]", err);
    walletBalance.textContent = "–";
  }
}

// ── Transaction history (via backend) ──────────────────────────────────────

async function refreshTransactions() {
  if (!walletPublicKey || !txList) return;
  txList.innerHTML = `<li class="tx-loading">Loading transactions…</li>`;
  try {
    const addr = walletPublicKey.toString();
    const data = await apiFetch(`/transactions/${addr}?cluster=${currentCluster}&limit=10`);
    renderTransactions(data.transactions);
  } catch (err) {
    console.error("[refreshTransactions]", err);
    txList.innerHTML = `<li class="tx-error">Could not load transactions.</li>`;
  }
}

function renderTransactions(txs) {
  if (!txList) return;
  if (!txs || txs.length === 0) {
    txList.innerHTML = `<li class="tx-empty">No transactions found.</li>`;
    return;
  }
  txList.innerHTML = txs
    .map((tx) => {
      const date = tx.blockTime
        ? new Date(tx.blockTime * 1000).toLocaleString()
        : "–";
      const delta =
        tx.solDelta !== null
          ? `<span class="tx-delta ${tx.solDelta >= 0 ? "positive" : "negative"}">${tx.solDelta >= 0 ? "+" : ""
          }${tx.solDelta} SOL</span>`
          : "";
      const sig = tx.signature.slice(0, 8) + "…" + tx.signature.slice(-6);
      return `
        <li class="tx-item ${tx.status}">
          <div class="tx-row">
            <span class="tx-sig">
              <a href="${tx.explorerUrl}" target="_blank" rel="noopener">${sig}</a>
            </span>
            ${delta}
          </div>
          <div class="tx-row tx-meta">
            <span class="tx-date">${date}</span>
            <span class="tx-status ${tx.status}">${tx.status}</span>
            ${tx.fee !== null ? `<span class="tx-fee">fee: ${tx.fee} SOL</span>` : ""}
          </div>
        </li>`;
    })
    .join("");
}

// ── Send SOL ───────────────────────────────────────────────────────────────

async function handleSend(event) {
  event.preventDefault();
  if (!walletPublicKey) { setStatus("Connect your wallet first.", "error"); return; }

  const toAddress = sendToInput.value.trim();
  const amountStr = sendAmountInput.value.trim();
  if (!toAddress || !amountStr) { setStatus("Enter a destination address and amount.", "error"); return; }

  // Validate via backend before touching the RPC
  try {
    const v = await apiFetch(`/validate/${encodeURIComponent(toAddress)}`);
    if (!v.valid) { setStatus("Invalid destination address.", "error"); return; }
  } catch { setStatus("Could not validate address.", "error"); return; }

  const lamports = Math.round(parseFloat(amountStr) * LAMPORTS_PER_SOL);
  if (!lamports || lamports <= 0) { setStatus("Invalid amount.", "error"); return; }

  try {
    setStatus("Building transaction…");
    const provider = getProvider();
    const fromPubkey = new PublicKey(walletPublicKey.toString());
    const toPubkey = new PublicKey(toAddress);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPubkey }).add(
      SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
    );

    setStatus("Waiting for wallet approval…");
    const { signature } = await provider.signAndSendTransaction(tx);

    setStatus("Confirming transaction…");
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    setStatus(`Transaction confirmed ✅  (${signature.slice(0, 12)}…)`, "success");

    await refreshAccountInfo();
    await refreshTransactions();
  } catch (err) {
    console.error(err);
    setStatus(err.code === 4001 ? "Transaction rejected in wallet." : "Transaction failed. Check console.", "error");
  }
}

// ── Cluster switch ─────────────────────────────────────────────────────────

async function switchCluster(cluster) {
  currentCluster = cluster;
  connection = new Connection(clusterApiUrl(cluster), "confirmed");
  switchDevnetButton.textContent = cluster === "devnet" ? "Switch to Mainnet" : "Switch to Devnet";
  if (walletPublicKey) {
    await refreshAccountInfo();
    await refreshTransactions();
  }
}

// ── Event listeners ────────────────────────────────────────────────────────

connectButton.addEventListener("click", connectWallet);
refreshButton.addEventListener("click", async () => {
  await refreshAccountInfo();
  await refreshTransactions();
});
switchDevnetButton.addEventListener("click", () => {
  const next = currentCluster === "devnet" ? "mainnet-beta" : "devnet";
  switchCluster(next);
});
sendForm.addEventListener("submit", handleSend);

// ── Wallet events ──────────────────────────────────────────────────────────

const provider = getProvider();
if (provider) {
  provider.on("accountChanged", async (newPublicKey) => {
    if (newPublicKey) {
      walletPublicKey = newPublicKey;
      await refreshAccountInfo();
      await refreshTransactions();
    } else {
      walletPublicKey = null;
      connectionStatus.textContent = "Not connected";
      connectionStatus.classList.add("muted");
      walletAddress.textContent = "–";
      walletAddress.classList.add("muted");
      walletBalance.textContent = "–";
      if (walletBalanceUsd) walletBalanceUsd.textContent = "";
      networkName.textContent = "–";
      networkName.classList.add("muted");
      connectButton.textContent = "Connect Wallet";
      connectButton.disabled = false;
      if (txList) txList.innerHTML = "";
    }
  });

  provider.on("disconnect", () => {
    walletPublicKey = null;
    connectionStatus.textContent = "Not connected";
    connectionStatus.classList.add("muted");
    walletAddress.textContent = "–";
    walletAddress.classList.add("muted");
    walletBalance.textContent = "–";
    if (walletBalanceUsd) walletBalanceUsd.textContent = "";
    connectButton.textContent = "Connect Wallet";
    connectButton.disabled = false;
    if (txList) txList.innerHTML = "";
  });
}
