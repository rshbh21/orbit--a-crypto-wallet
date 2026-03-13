import React from 'react';

export function WalletCard({ connectionStatus, networkName, walletPublicKey, sol, usdValue }) {
    const address = walletPublicKey ? walletPublicKey.toString() : '–';
    const isMuted = !walletPublicKey;

    return (
        <div className="orbit-card orbit-status-card">
            <h2>Connection</h2>
            <div className="orbit-status-row">
                <span className="label">Status</span>
                <span className={`value ${isMuted ? 'muted' : ''}`}>{connectionStatus}</span>
            </div>
            <div className="orbit-status-row">
                <span className="label">Network</span>
                <span className={`value ${isMuted ? 'muted' : ''}`}>{networkName}</span>
            </div>
            <div className="orbit-status-row">
                <span className="label">Address</span>
                <span className={`value mono truncated ${isMuted ? 'muted' : ''}`}>{address}</span>
            </div>
            <div className="orbit-status-row">
                <span className="label">Balance</span>
                <span className="value mono">{sol != null ? `${sol} SOL` : '–'}</span>
            </div>
            <div className="orbit-status-row">
                <span className="label">≈ USD</span>
                <span className="value muted">{usdValue ? `≈ $${usdValue}` : ''}</span>
            </div>
        </div>
    );
}
