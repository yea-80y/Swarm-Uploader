// BeeConnection.jsx (Finalized - Direct API for TTL and Batch Data)
import '../styles.css';
import { Bee } from '@ethersphere/bee-js';


export const BLOCK_TIME_S = 5; // Gnosis block time
export const BLOCKS_PER_DAY = Math.floor((24 * 60 * 60) / BLOCK_TIME_S); // 86400 / 5 = 17280


// ✅ Corrected Function to Fetch Current Stamp Price
export async function fetchCurrentStampPrice(beeApiUrl) {
  try {
    const response = await fetch(`${beeApiUrl}/chainstate`);
    if (!response.ok) {
      throw new Error("Failed to fetch chainstate.");
    }

    const priceData = await response.json();
    const stampPrice = parseInt(priceData.currentPrice);
    console.log("🔎 Current Stamp Price (PLUR per chunk per block):", stampPrice);

    if (isNaN(stampPrice)) {
      throw new Error("Stamp price not found in response.");
    }

    return stampPrice;
  } catch (err) {
    console.error("❌ Error fetching stamp price:", err);
    return null;
  }
}

// BeeConnection.jsx (Centralized TTL Retrieval)
export function getBatchTTL(batch) {
  // Use a clear priority order for retrieving TTL
  return batch.batchTTL || batch.ttl || batch.expires || undefined;
}


// ✅ Corrected Top-Up Cost Calculation (Accurate with Fixed Scaling)  // DilutionPopup.jsx
/**
 * Fetch the on-chain stamp amount (total PLUR) for a batch
 */
export async function getStampAmount(beeApiUrl, batchId) {
  try {
    const response = await fetch(`${beeApiUrl}/stamps/${batchId}`);
    if (!response.ok) throw new Error("Failed to fetch stamp data");
    const data = await response.json();
    return Number(data.amount || 0);
  } catch (err) {
    console.error("❌ Error fetching stamp amount:", err);
    return 0;
  }
}


/**
 * Calculate remaining TTL in seconds for a batch at its current depth
 */
export async function calculateRemainingTTL(beeApiUrl, batchDepth, batchId) {
  const amount = await getStampAmount(beeApiUrl, batchId);
  const pricePerChunkPerBlock = await fetchCurrentStampPrice(beeApiUrl);
  const chunks = 2 ** batchDepth;
  const BLOCK_TIME_S = 5;
  const ttlRaw = (amount / (chunks * pricePerChunkPerBlock)) * BLOCK_TIME_S;
  return Math.round(ttlRaw); // Round once only here, avoid underflow
}

  /**
   * Calculate extra PLUR needed to reach a desired TTL after diluting
   */
  export async function calculateTopUp(
    beeApiUrl,
    currentDepth,
    newDepth,
    batchId,
    desiredTTLSecs
  ) {
    const pricePerChunkPerBlock = await fetchCurrentStampPrice(beeApiUrl);
    const chunksNew = BigInt(2 ** newDepth);

    // 🔍 Use integer math with BigInt to avoid floating-point errors
    const priceBig = BigInt(pricePerChunkPerBlock);
    const ttlBig = BigInt(desiredTTLSecs);
    const blockTimeBig = BigInt(BLOCK_TIME_S);

    const rawPerChunk = (priceBig * ttlBig + blockTimeBig - 1n) / blockTimeBig; // emulate ceil
    const minPerChunk = priceBig * BigInt(BLOCKS_PER_DAY);
    const finalPerChunk = rawPerChunk > minPerChunk ? rawPerChunk : minPerChunk;

    const totalTopUp = finalPerChunk * chunksNew;
    return Number(totalTopUp);
  }

  /**
   * Unified helper to preview top-up + TTL after dilution
   */
  export async function getDilutionPreview(beeApiUrl, batch, newDepth, selectedTTL) {
  try {
    // ✅ Convert 'match' to actual TTL before using it
    if (selectedTTL === "match") {
      selectedTTL = await calculateRemainingTTL(beeApiUrl, batch.depth, batch.batchID);
    }

    const ttlRemaining = await calculateRemainingTTL(beeApiUrl, batch.depth, batch.batchID);
    const chunksOld = 2 ** batch.depth;
    const chunksNew = 2 ** newDepth;
    const dilutedTTL = ttlRemaining * (chunksOld / chunksNew);
    const estimatedTTL = formatTTL(dilutedTTL);

    if (selectedTTL === 'none') {
      return {
        estimatedTTL,
        totalPlur: '0',
        totalXBZZ: '0.00000000'
      };
    }

    const desiredTTL = selectedTTL === 'match'
      ? ttlRemaining
      : parseInt(selectedTTL);

    const topupPlur = await calculateTopUp(
      beeApiUrl,
      batch.depth,
      newDepth,
      batch.batchID,
      desiredTTL
    );

    // Enforce strict per-chunk minimum
    return {
      estimatedTTL,
      totalPlur: topupPlur.toString(),
      totalXBZZ: (topupPlur / 1e16).toFixed(8)
    };

  } catch (err) {
    console.error("❌ getDilutionPreview failed:", err);
    return {
      estimatedTTL: "0d 0h 0m",
      totalPlur: "0",
      totalXBZZ: "0.00000000"
    };
  }
}

// ✅ Centralized TTL Formatter (Days, Hours, Minutes)
export function formatTTL(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

// Converts BZZ from PLUR units to readable xBZZ
export function formatBzz(plur) {
  return (parseFloat(plur) / 10 ** 16).toFixed(4) + " xBZZ";
}

// ✅ Maps depth → effective volume (MB) using Swarm’s medium erasure coding (unencrypted)
export const EFFECTIVE_VOLUME_MEDIUM_MB = {
  17: 0.04156, 18: 6.19, 19: 104.18, 20: 655.36,
  21: 1310.72, 22: 2621.44, 23: 5242.88, 24: 10485.76,
  25: 20971.52, 26: 41943.04, 27: 83886.08, 28: 167772.16,
  29: 335544.32, 30: 671088.64, 31: 1342177.28, 32: 2684354.56,
  33: 5368709.12, 34: 10737418.24, 35: 21474836.48
};

// ✅ Function to Calculate and Format Capacity with Dynamic Units (Fixed)
export const calculateCapacity = (depth) => {
  const size = EFFECTIVE_VOLUME_MEDIUM_MB[depth];
  if (!size) return "Unknown";

  // ✏️ Always show MB — even for very small sizes like 0.04 MB (Swarm docs use MB)
  if (size < 1024) return `${size.toFixed(2)} MB`;
  return `${(size / 1024).toFixed(2)} GB`;
};


// ✅ Function to Fetch TTL for a Batch
export const fetchBatchTTL = async (beeApiUrl, batchID) => {
  try {
    const response = await fetch(`${beeApiUrl}/stamps/${batchID}`);
    const data = await response.json();
    console.log("🔎 API Response (TTL Debug):", data); // ✅ Debug API Response

    // Use correct key for TTL
    return data.ttl || data.batchTTL || "Unknown";
  } catch {
    return "Unknown";
  }
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

// Fetch all postage batches using direct API (including TTL)  //ConnectionScreen
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
      capacity: calculateCapacity(batch.depth),
      ttl: ttlDisplay,
      type: batch.immutableFlag ? "Immutable" : "Mutable"
    };
  }).sort((a, b) => b.blockNumber - a.blockNumber);
};

// ✅ Function to Dilute Batch with Dynamic Top-Up Cost (Corrected)
export async function diluteBatch(beeApiUrl, batchID, newDepth, ttlTopup) {
  try {
    // ✅ Step 1: Top-Up to Maintain or Extend TTL (Optional)
    if (ttlTopup > 0) {
      console.log("🔎 Top-Up Amount (PLUR):", ttlTopup);
      const topupUrl = `${beeApiUrl}/stamps/${batchID}/topup/${Math.floor(ttlTopup)}`; // Pass in URL
      const topupResponse = await fetch(topupUrl, {
        method: "POST"
      });

      if (!topupResponse.ok) {
        console.error("❌ Top-Up Failed:", await topupResponse.text());
        return { success: false, message: "❌ Failed to Top-Up TTL." };
      }
      console.log("✅ Top-Up Successful.");
    }


    // ✅ Step 2: Correct API Call for Dilution (Direct PATCH)
    console.log("🔎 Diluting Batch:", batchID, "to New Depth:", newDepth);
    const response = await fetch(`${beeApiUrl}/stamps/dilute/${batchID}/${newDepth}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("❌ Dilution Failed:", await response.text());
      return { success: false, message: "❌ Failed to Dilute Batch." };
    }

    console.log("✅ Batch Diluted Successfully.");
    return { success: true, message: "✅ Batch diluted successfully." };

  } catch (err) {
    console.error("❌ Error during batch dilution:", err);
    return { success: false, message: "❌ Error during batch dilution." };
  }
}
