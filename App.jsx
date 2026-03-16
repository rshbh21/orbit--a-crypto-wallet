import React, { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { WalletCard } from './components/WalletCard';
import { SendForm } from './components/SendForm';
import { Tools } from './components/Tools';
import { TransactionList } from './components/TransactionList';
import { useWallet } from './hooks/useWallet';
import { usePrice } from './hooks/usePrice';
import { useBalance } from './hooks/useBalance';
import { useTransactions } from './hooks/useTransactions';

export default function App() {
  const [cluster, setCluster] = useState('devnet');

  const { walletPublicKey, connectionStatus, isConnecting, isConnected, provider, connectWallet } =
    useWallet();
  const { price, change24h } = usePrice();
  const { sol, usdValue, loading: balLoading, refresh: refreshBalance, reset: resetBalance } =
    useBalance();
  const { transactions, loading: txLoading, error: txError, refresh: refreshTxs, reset: resetTxs } =
    useTransactions();

  // Network label
  const networkName =
    !isConnected ? '–' :
      cluster === 'mainnet-beta' ? 'Solana Mainnet' :
        cluster === 'devnet' ? 'Devnet' : 'Testnet';

  // Fetch wallet data when connection state or cluster changes
  const refreshAll = useCallback(async () => {
    if (!walletPublicKey) return;
    const addr = walletPublicKey.toString();
    await Promise.all([
      refreshBalance(addr, cluster),
      refreshTxs(addr, cluster),
    ]);
  }, [walletPublicKey, cluster, refreshBalance, refreshTxs]);

  useEffect(() => {
    if (isConnected) {
      refreshAll();
    } else {
      resetBalance();
      resetTxs();
    }
  }, [isConnected, cluster, refreshAll, resetBalance, resetTxs]);

  function handleSwitchCluster() {
    setCluster((prev) => prev === 'devnet' ? 'mainnet-beta' : 'devnet');
  }

  return (
    <div id="app">
      <Header
        price={price}
        change24h={change24h}
        isConnected={isConnected}
        isConnecting={isConnecting}
        onConnect={connectWallet}
      />

      <main className="orbit-main">
        {/* Hero */}
        <section className="orbit-hero">
          <div className="orbit-hero-text">
            <h1>Orbit Wallet</h1>
            <p>
              A clean, minimal Solana wallet interface in your browser. Connect with Phantom,
              Backpack, or another compatible Solana wallet to get started.
            </p>
            <ul className="orbit-hero-list">
              <li>Secure – your keys stay in your wallet extension</li>
              <li>Transparent – shows your current network and balance</li>
              <li>Practical – send SOL in a few clicks</li>
            </ul>
            <p className="orbit-warning">
              Use Devnet for experimentation. Do not send large amounts of real SOL from this demo UI.
            </p>
          </div>

          <WalletCard
            connectionStatus={connectionStatus}
            networkName={networkName}
            walletPublicKey={walletPublicKey}
            sol={sol}
            usdValue={usdValue}
          />
        </section>

        {/* Action grid */}
        <section className="orbit-grid">
          <SendForm
            walletPublicKey={walletPublicKey}
            cluster={cluster}
            provider={provider}
            onSuccess={refreshAll}
          />
          <Tools
            onRefresh={refreshAll}
            onSwitchCluster={handleSwitchCluster}
            cluster={cluster}
            loading={balLoading}
          />
        </section>

        {/* Transaction history */}
        <TransactionList
          transactions={transactions}
          loading={txLoading}
          error={txError}
        />
      </main>

      <footer className="orbit-footer">
        <span>Orbit Wallet – demo Solana web wallet UI</span>
      </footer>
    </div>
  );
}
