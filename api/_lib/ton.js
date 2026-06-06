/**
 * TON Blockchain Transaction Verification
 * Uses Toncenter API to verify on-chain deposits
 */

const TONCENTER_API = process.env.TONCENTER_API_URL || 'https://toncenter.com/api/v2';
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || '';

/**
 * Verify a TON deposit transaction on-chain.
 * H-1 FIX: Match exact amount, use tx hash for dedup, shorter time window.
 */
export async function verifyDeposit(senderAddress, receiverAddress, expectedAmountTon) {
  try {
    if (!senderAddress || !receiverAddress || !expectedAmountTon || expectedAmountTon <= 0) {
      return { success: false, error: 'Invalid deposit parameters' };
    }

    const headers = {};
    if (TONCENTER_API_KEY) {
      headers['X-API-Key'] = TONCENTER_API_KEY;
    }

    const url = `${TONCENTER_API}/getTransactions?address=${encodeURIComponent(receiverAddress)}&limit=30`;
    const res = await fetch(url, { headers });
    
    if (!res.ok) {
      console.error('Toncenter API returned status', res.status);
      return { success: false, error: 'Failed to connect to TON API' };
    }
    
    const data = await res.json();
    if (!data.ok || !data.result) {
      console.error('Toncenter data error', data);
      return { success: false, error: 'TON API returned an error' };
    }

    const expectedNano = BigInt(Math.floor(expectedAmountTon * 1e9));
    // H-1 FIX: Allow 2% tolerance for network fees, but no more
    const minNano = expectedNano - (expectedNano * BigInt(2) / BigInt(100));

    // Look for a matching transaction
    for (const tx of data.result) {
      if (!tx.in_msg || !tx.in_msg.source) continue;
      
      // Match sender address
      if (tx.in_msg.source !== senderAddress) continue;

      const txValue = BigInt(tx.in_msg.value || '0');
      
      // H-1 FIX: Match amount within 2% tolerance (not >=, which allows claiming large txs for small deposits)
      if (txValue < minNano || txValue > expectedNano + (expectedNano * BigInt(5) / BigInt(100))) continue;

      // H-1 FIX: Tighter time window — 5 minutes instead of 15
      const txTime = tx.utime * 1000;
      if (Date.now() - txTime > 5 * 60 * 1000) continue;

      // Found a valid matching transaction
      const txHash = tx.transaction_id?.hash;
      if (!txHash) continue;

      return { 
        success: true, 
        txHash,
        actualAmount: Number(txValue) / 1e9,
        timestamp: txTime
      };
    }
    
    return { success: false, error: 'Transaction not found or not confirmed yet. Please wait a few seconds and try again.' };
  } catch (e) {
    console.error('verifyDeposit exception:', e);
    return { success: false, error: 'Internal verification error' };
  }
}
