import React, { useState } from 'react';
import { validateAddress } from '../api';

const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, clusterApiUrl } =
    window.solanaWeb3 || {};

export function SendForm({ walletPublicKey, cluster, provider, onSuccess }) {
    const [toAddress, setToAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState('');
    const [statusType, setStatusType] = useState(''); // '' | 'success' | 'error'
    const [sending, setSending] = useState(false);

    function setMsg(text, type = '') {
        setStatus(text);
        setStatusType(type);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!walletPublicKey) { setMsg('Connect your wallet first.', 'error'); return; }

        const to = toAddress.trim();
        const amtStr = amount.trim();
        if (!to || !amtStr) { setMsg('Enter a destination address and amount.', 'error'); return; }

        setSending(true);
        try {
            // Validate address via backend
            const { valid } = await validateAddress(to);
            if (!valid) { setMsg('Invalid destination address.', 'error'); setSending(false); return; }

            const lamports = Math.round(parseFloat(amtStr) * LAMPORTS_PER_SOL);
            if (!lamports || lamports <= 0) { setMsg('Invalid amount.', 'error'); setSending(false); return; }

            setMsg('Building transaction…');

            const p = provider.current;
            const connection = new Connection(clusterApiUrl(cluster), 'confirmed');
            const fromPubkey = new PublicKey(walletPublicKey.toString());
            const toPubkey = new PublicKey(to);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPubkey }).add(
                SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
            );

            setMsg('Waiting for wallet approval…');
            const { signature } = await p.signAndSendTransaction(tx);

            setMsg('Confirming transaction…');
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
            setMsg(`Transaction confirmed ✅  (${signature.slice(0, 12)}…)`, 'success');

            setToAddress('');
            setAmount('');
            onSuccess?.();
        } catch (err) {
            console.error(err);
            setMsg(
                err.code === 4001
                    ? 'Transaction rejected in wallet.'
                    : 'Transaction failed. Check console.',
                'error'
            );
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="orbit-card">
            <h2>Send SOL</h2>
            <form id="sendForm" className="orbit-form" onSubmit={handleSubmit}>
                <label>
                    To address
                    <input
                        id="sendTo"
                        type="text"
                        placeholder="Solana public key…"
                        autoComplete="off"
                        required
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                    />
                </label>
                <label>
                    Amount (SOL)
                    <input
                        id="sendAmount"
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </label>
                <button
                    type="submit"
                    className="orbit-button full primary"
                    disabled={sending}
                >
                    {sending ? 'Sending…' : 'Send'}
                </button>
                <p id="sendStatus" className={`orbit-status-text ${statusType}`}>{status}</p>
            </form>
        </div>
    );
}
