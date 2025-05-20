// BeeConnection.jsx (Finalized - Direct API for TTL and Batch Data)
import './styles.css';


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

// Helper function to format TTL (Days, Hours, Minutes)
export function calculateTTLDisplay(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} Days, ${hours} Hours`;
  } else if (hours > 0) {
    return `${hours} Hours, ${minutes} Minutes`;
  } else {
    return `${minutes} Minutes`;
  }
}

// ✅ Theoretical Capacity Calculation Functions
export const calculateTheoreticalCapacityChunks = (depth) => {
  return Math.pow(2, depth); // 2^depth chunks (theoretical)
};

// ✅ For Debugging - Not Used in UI
export const calculateTheoreticalCapacityMB = (depth) => {
  const chunkSizeBytes = 4096; // Each chunk is 4096 bytes
  const totalChunks = calculateTheoreticalCapacityChunks(depth);
  const totalBytes = totalChunks * chunkSizeBytes;
  return (totalBytes / (1024 * 1024)).toFixed(2); // Convert to MB, 2 decimal places
};


// ✅ Corrected Top-Up Cost Calculation (Accurate with Fixed Scaling)
export async function calculateTopupCost(beeApiUrl, batchID, newDepth, desiredTTL) {
  try {
    const response = await fetch(`${beeApiUrl}/stamps/${batchID}`);
    const data = await response.json();
    const currentDepth = data.depth;
    const existingAmountPerChunk = BigInt(data.amount); // PLUR per chunk as BigInt
    const stampPrice = BigInt(await fetchCurrentStampPrice(beeApiUrl));
    const blockTime = 5n; // Gnosis Chain block time (in seconds) as BigInt

    console.log("🔎 Batch Details for Top-Up Calculation:", {
      currentDepth,
      existingAmountPerChunk: existingAmountPerChunk.toString(),
    });

    if (!stampPrice) {
      console.error("❌ Error: Stamp price not fetched.");
      return { totalPlur: "0", totalXBZZ: "0.0000", finalTTL: "0d 0h 0m", effectiveTTL: "0d 0h 0m" };
    }

    // ✅ Calculate the TTL to use (Only Fixed Options)
    let finalTTL = BigInt(desiredTTL);
    if (finalTTL <= 0) {
      console.error("❌ Invalid TTL value:", finalTTL);
      return { totalPlur: "0", totalXBZZ: "0.0000", finalTTL: "0d 0h 0m", effectiveTTL: "0d 0h 0m" };
    }

    console.log("🔎 Calculating for Final TTL:", finalTTL.toString());

    // ✅ Correct Calculation for Required Amount Per Chunk (Accurate)
    const requiredAmountPerChunk = stampPrice * finalTTL;
    console.log("🔎 Required Amount Per Chunk (PLUR):", requiredAmountPerChunk.toString());

    // ✅ Calculate the total balance required for the new depth
    const requiredTotalBalance = requiredAmountPerChunk * BigInt(Math.pow(2, newDepth));
    const currentTotalBalance = existingAmountPerChunk * BigInt(Math.pow(2, currentDepth));
    
    // ✅ Top-Up Amount is the difference, but never negative
    const topupAmount = requiredTotalBalance > currentTotalBalance 
      ? requiredTotalBalance - currentTotalBalance 
      : BigInt(0);
    
    console.log("🔎 Calculated Top-Up Amount (PLUR - Clean Integer):", topupAmount.toString());

    // ✅ Convert PLUR to xBZZ for display
    const totalXBZZ = (Number(topupAmount) / 1e16).toFixed(8);

    // ✅ Calculate Effective TTL for Existing Stamps After Dilution
    const existingTTL = data.ttl || 0;
    const effectiveTTL = Math.floor(existingTTL * (Math.pow(2, currentDepth) / Math.pow(2, newDepth)));
    console.log("🔎 Effective TTL After Dilution:", effectiveTTL);

    // ✅ Calculate and format final TTL (for display)
    const finalTTLDisplay = formatTTL(Number(finalTTL));
    const effectiveTTLDisplay = formatTTL(effectiveTTL);

    return {
      totalPlur: topupAmount.toString(),
      totalXBZZ: totalXBZZ,
      finalTTL: finalTTLDisplay,
      effectiveTTL: effectiveTTLDisplay
    };
  } catch (err) {
    console.error("❌ Error calculating top-up cost:", err);
    return {
      totalPlur: "0",
      totalXBZZ: "0.0000",
      finalTTL: "0d 0h 0m",
      effectiveTTL: "0d 0h 0m"
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

// Maps depth → effective volume (MB) using Swarm’s medium erasure coding
export const EFFECTIVE_VOLUME_MEDIUM_MB = {
  17: 6.19, 18: 104.18, 19: 639.27, 20: 3270,
  21: 6540, 22: 13107, 23: 26214, 24: 52428,
  25: 104857, 26: 209715, 27: 419430, 28: 838860,
  29: 1677721, 30: 3355443, 31: 7860000, 32: 15870000,
  33: 31940000, 34: 64190000, 35: 128800000
};

// Function to Calculate Capacity
export const calculateCapacity = (depth) => {
  return EFFECTIVE_VOLUME_MEDIUM_MB[depth] || "Unknown";
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

// ✅ Function to Dilute Batch with Dynamic Top-Up Cost (Corrected)
export async function diluteBatch(beeApiUrl, batchID, newDepth, ttlTopup) {
  try {
    // ✅ Step 1: Top-Up to Maintain or Extend TTL (Optional)
    if (ttlTopup > 0) {
      console.log("🔎 Top-Up Amount (PLUR):", ttlTopup);
      const topupResponse = await fetch(`${beeApiUrl}/stamps/${batchID}/topup`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: ttlTopup })
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
