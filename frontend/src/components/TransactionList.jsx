import React from 'react';

function TxItem({ tx }) {
    const date = tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : '–';
    const sig = tx.signature.slice(0, 8) + '…' + tx.signature.slice(-6);
    const hasDelta = tx.solDelta !== null;
    const positive = hasDelta && tx.solDelta >= 0;

    return (
        <li className={`tx-item ${tx.status}`}>
            <div className="tx-row">
                <span className="tx-sig">
                    <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">{sig}</a>
                </span>
                {hasDelta && (
                    <span className={`tx-delta ${positive ? 'positive' : 'negative'}`}>
                        {positive ? '+' : ''}{tx.solDelta} SOL
                    </span>
                )}
            </div>
            <div className="tx-row tx-meta">
                <span className="tx-date">{date}</span>
                <span className={`tx-status ${tx.status}`}>{tx.status}</span>
                {tx.fee !== null && <span className="tx-fee">fee: {tx.fee} SOL</span>}
            </div>
        </li>
    );
}

export function TransactionList({ transactions, loading, error }) {
    return (
        <section className="orbit-card orbit-tx-section">
            <h2>Recent Transactions</h2>
            <ul id="txList" className="tx-list">
                {loading && <li className="tx-loading">Loading transactions…</li>}
                {!loading && error && <li className="tx-error">{error}</li>}
                {!loading && !error && transactions.length === 0 && (
                    <li className="tx-empty">Connect your wallet to load transactions.</li>
                )}
                {!loading && !error && transactions.map((tx) => (
                    <TxItem key={tx.signature} tx={tx} />
                ))}
            </ul>
        </section>
    );
}
