import React from 'react';

export function Header({ price, change24h, isConnected, isConnecting, onConnect }) {
    const positive = change24h >= 0;

    let btnLabel = 'Connect Wallet';
    if (isConnecting) btnLabel = 'Connecting…';
    else if (isConnected) btnLabel = 'Connected ✓';

    return (
        <header className="orbit-header">
            <div className="orbit-logo">
                <div className="orbit-logo-orbit" />
                <span>Orbit</span>
            </div>

            <div className="orbit-price-ticker">
                <span className="ticker-label">SOL</span>
                <span className="ticker-price">
                    {price != null ? `$${price.toFixed(2)}` : '–'}
                </span>
                {change24h != null && (
                    <span className={`ticker-change ${positive ? 'positive' : 'negative'}`}>
                        {positive ? '▲' : '▼'} {Math.abs(change24h).toFixed(2)}%
                    </span>
                )}
                {change24h == null && <span className="ticker-change">–</span>}
            </div>

            <button
                id="connectButton"
                className="orbit-button primary"
                onClick={onConnect}
                disabled={isConnecting || isConnected}
            >
                {btnLabel}
            </button>
        </header>
    );
}
