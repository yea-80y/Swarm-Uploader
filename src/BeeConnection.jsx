// BeeConnection.jsx (Finalized - Direct API for TTL and Batch Data)
import './styles.css';

// Converts BZZ from PLUR units to readable xBZZ
export function formatBzz(plur) {
  return (parseFloat(plur) / 10 ** 16).toFixed(4) + " xBZZ";
}

// Maps depth → effective volume (MB) using Swarm’s medium erasure coding
export const EFFECTIVE_VOLUME_MEDIUM_MB = {
  17: 6.19, 18: 104.18, 19: 639.27, 20: 3270,
  21: 6540, 22: 13107, 23: 26214, 24: 52428,
  25: 104857, 26: 209715, 27: 419430, 28: 838860,
  29: 1677721, 30: 3355443, 31: 7860000, 32: 15870000,
  33: 31940000, 34: 64190000, 35: 128800000
};

// Fetch wallet balance using the correct API (xBZZ)
export const fetchWalletBalance = async (beeApiUrl) => {
  const response = await fetch(`${beeApiUrl}/wallet`);
  if (!response.ok) throw new Error("Failed to fetch wallet balance.");
  const walletData = await response.json();

  const xBZZ = walletData.bzzBalance
    ? (parseFloat(walletData.bzzBalance) / 10 ** 16).toFixed(4)
    : "0.0000";

  return {
    bzzBalance: `${xBZZ} xBZZ`,
    ethereumAddress: walletData.walletAddress || "N/A"
  };
};

// Fetch all postage batches using direct API (including TTL)
export const fetchPostageBatches = async (beeApiUrl) => {
  const response = await fetch(`${beeApiUrl}/stamps`);
  if (!response.ok) throw new Error("Failed to fetch postage batches.");

  const data = await response.json();
  const batches = data.stamps;

  return batches.map((batch) => {
    const capacityMB = EFFECTIVE_VOLUME_MEDIUM_MB[batch.depth] || 0;
    const ttlSeconds = batch.batchTTL;

    let ttlDisplay = "∞ (Unlimited)";
    if (typeof ttlSeconds === "number" && ttlSeconds > 0) {
      const days = Math.floor(ttlSeconds / 86400);
      const hours = Math.floor((ttlSeconds % 86400) / 3600);
      const minutes = Math.floor((ttlSeconds % 3600) / 60);
      ttlDisplay = `${days}d ${hours}h ${minutes}m`;
    }

    return {
      ...batch,
      batchID: batch.batchID?.toString() || "N/A",
      capacity: `${capacityMB} MB`,
      ttl: ttlDisplay,
      type: batch.immutableFlag ? "Immutable" : "Mutable"
    };
  }).sort((a, b) => b.blockNumber - a.blockNumber);
};
