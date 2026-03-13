import { useState, useCallback, useEffect, useRef } from 'react';

function getProvider() {
    if ('phantom' in window) {
        const p = window.phantom?.solana;
        if (p?.isPhantom) return p;
    }
    if ('solana' in window) return window.solana;
    return null;
}

function getProviderAsync(timeoutMs = 3000) {
    return new Promise((resolve) => {
        const provider = getProvider();
        if (provider) { resolve(provider); return; }

        const onReady = () => {
            clearTimeout(timer);
            resolve(getProvider());
        };
        window.addEventListener('phantom#initialized', onReady, { once: true });

        let elapsed = 0;
        const interval = setInterval(() => {
            const p = getProvider();
            if (p) {
                clearInterval(interval);
                clearTimeout(timer);
                window.removeEventListener('phantom#initialized', onReady);
                resolve(p);
            }
        }, 100);

        const timer = setTimeout(() => {
            clearInterval(interval);
            window.removeEventListener('phantom#initialized', onReady);
            resolve(null);
        }, timeoutMs);
    });
}

export function useWallet() {
    const [walletPublicKey, setWalletPublicKey] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Not connected');
    const [isConnecting, setIsConnecting] = useState(false);
    const providerRef = useRef(null);

    const disconnect = useCallback(() => {
        setWalletPublicKey(null);
        setConnectionStatus('Not connected');
    }, []);

    // Subscribe to wallet events once provider is known
    useEffect(() => {
        const provider = getProvider();
        if (!provider) return;
        providerRef.current = provider;

        const onAccountChanged = (newKey) => {
            if (newKey) {
                setWalletPublicKey(newKey);
                setConnectionStatus('Connected');
            } else {
                disconnect();
            }
        };
        const onDisconnect = () => disconnect();

        provider.on('accountChanged', onAccountChanged);
        provider.on('disconnect', onDisconnect);

        return () => {
            provider.off?.('accountChanged', onAccountChanged);
            provider.off?.('disconnect', onDisconnect);
        };
    }, [disconnect]);

    const connectWallet = useCallback(async () => {
        setIsConnecting(true);
        setConnectionStatus('Detecting wallet…');

        const provider = await getProviderAsync(3000);
        if (!provider) {
            setIsConnecting(false);
            setConnectionStatus('Not connected');
            alert(
                'No Solana wallet extension detected.\n\n' +
                'Possible fixes:\n' +
                '1. Make sure Phantom is enabled for this site.\n' +
                '2. Try refreshing the page after installing Phantom.\n\n' +
                'Get Phantom at https://phantom.app'
            );
            return;
        }

        try {
            setConnectionStatus('Connecting…');
            const resp = await provider.connect();
            providerRef.current = provider;
            setWalletPublicKey(resp.publicKey);
            setConnectionStatus('Connected');
        } catch (err) {
            console.error(err);
            setConnectionStatus('Not connected');
            if (err.code !== 4001) alert('Failed to connect wallet. Check your wallet extension.');
        } finally {
            setIsConnecting(false);
        }
    }, []);

    return {
        walletPublicKey,
        connectionStatus,
        isConnecting,
        isConnected: !!walletPublicKey,
        provider: providerRef,
        connectWallet,
    };
}
