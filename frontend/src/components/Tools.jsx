import React from 'react';

export function Tools({ onRefresh, onSwitchCluster, cluster, loading }) {
    const isMainnet = cluster === 'mainnet-beta';
    return (
        <div className="orbit-card">
            <h2>Tools</h2>
            <div className="orbit-tools">
                <button
                    id="refreshButton"
                    className="orbit-button secondary full"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    {loading ? 'Refreshing…' : 'Refresh balance'}
                </button>
                <button
                    id="switchDevnetButton"
                    className="orbit-button ghost full"
                    onClick={onSwitchCluster}
                >
                    {isMainnet ? 'Switch to Devnet' : 'Switch to Mainnet'}
                </button>
                <p className="orbit-helper-text">
                    Orbit is a non-custodial interface. It never sees your private keys – all signing
                    happens inside your wallet extension.
                </p>
            </div>
        </div>
    );
}
