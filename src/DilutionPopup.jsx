// DilutionPopup.jsx — FINAL VERSION (Accurate TTL + PLUR Per Chunk + Comments)

import React, { useState, useEffect } from "react";
import "./styles.css";
import {
  BLOCK_TIME_S,
  calculateCapacity,
  formatTTL,
  getDilutionPreview,
  fetchWalletBalance,
  fetchCurrentStampPrice,
  EFFECTIVE_VOLUME_MEDIUM_MB
} from "./BeeConnection";
import { Bee } from "@ethersphere/bee-js";

export default function DilutionPopup({ beeApiUrl, batch, onClose, onDiluteSuccess, fileSizeMB }) {
  const [dilutionTTL, setDilutionTTL] = useState(31536000); // Default: 1 year in seconds
  const [topupCost, setTopupCost] = useState({ totalPlur: "0.00000000", totalXBZZ: "0.00000000" });
  const [newDepth, setNewDepth] = useState(batch.depth); // Auto-calculated if file exceeds capacity
  const [status, setStatus] = useState(null); // User-visible status message
  const [showConfirmation, setShowConfirmation] = useState(false); // Final confirmation prompt
  const [estimatedFinalTTL, setEstimatedFinalTTL] = useState("0d 0h 0m"); // TTL shown to user
  const [plurPerChunk, setPlurPerChunk] = useState(0); // Shown for debug/verifiability

  // TTL options (dropdown menu)
  const TTL_OPTIONS = [
    { label: 'Keep existing TTL', value: 'match' },
    { label: '24 hrs', value: 86400 },
    { label: '1 week', value: 604800 },
    { label: '1 month', value: 2592000 },
    { label: '6 months', value: 15768000 },
    { label: '1 year', value: 31536000 },
    { label: 'No top-up', value: 'none' }
  ];

  /**
   * 🔁 Auto-calculate new required depth based on file size and batch capacity
   */
  useEffect(() => {
    let requiredDepth = batch.depth;
    while (fileSizeMB > EFFECTIVE_VOLUME_MEDIUM_MB[requiredDepth] && requiredDepth < 35) {
      requiredDepth++;
    }
    setNewDepth(requiredDepth);
  }, [fileSizeMB, batch.depth]);

  /**
   * 🔁 Fetch dilution preview cost, estimated TTL, and PLUR per chunk
   */
    useEffect(() => {
  const fetchCost = async () => {
    try {
      const chunksNew = 2 ** newDepth;

      let ttlForCost;
      let finalTTLSeconds = 0;

      // ✅ Get dilution cost preview as before
      if (dilutionTTL === "match") {
        ttlForCost = batch.ttl || 0;
        finalTTLSeconds = ttlForCost;
      } else if (dilutionTTL === "none") {
        ttlForCost = "none"; // still needed to trigger PLUR = 0

      // ✅ Estimate TTL after dilution using depth difference
      try {
        const currentTTL = batch.ttl || 0;
        const depthChange = batch.depth - newDepth;
        const estimatedSeconds = currentTTL * Math.pow(2, depthChange);
        finalTTLSeconds = estimatedSeconds;

        console.log("🐝 Debug: Calculated No-Top-Up TTL from depth change:");
        console.log("🐝 Depth Change:", batch.depth, "→", newDepth);
        console.log("🐝 Estimated Final TTL (s):", estimatedSeconds);
      } catch (err) {
        console.error("❌ Error estimating TTL after dilution:", err);
        finalTTLSeconds = 0;
      }
    }
 else {
        ttlForCost = dilutionTTL;
        finalTTLSeconds = (batch.ttl || 0) + dilutionTTL;
      }

      const cost = await getDilutionPreview(beeApiUrl, batch, newDepth, ttlForCost);
      setTopupCost(cost);

      const stampPrice = await fetchCurrentStampPrice(beeApiUrl);
      const perChunk = Number(BigInt(cost.totalPlur) / BigInt(chunksNew));
      setPlurPerChunk(perChunk);

      // ✅ TTL display: manual calculation for 'none'
      if (dilutionTTL === "none") {
  try {
    const stampRes = await fetch(`${beeApiUrl}/stamps/${batch.batchID}`);
    const stampJson = await stampRes.json();
    const stampAmount = parseFloat(stampJson.normalisedBalance || 0); // ✅ Corrected key
    const stampPrice = await fetchCurrentStampPrice(beeApiUrl);

    console.log("🐝 Debug: normalisedBalance =", stampAmount);
    console.log("🐝 Debug: stampPrice =", stampPrice);
    console.log("🐝 Debug: newDepth =", newDepth, " → chunksNew =", chunksNew);


    if (stampAmount > 0 && stampPrice > 0) {
      const rawTTL = (stampAmount / (chunksNew * stampPrice)) * BLOCK_TIME_S;
      setEstimatedFinalTTL(formatTTL(rawTTL));
    } else {
      setEstimatedFinalTTL("0d 0h 0m");
    }
  } catch (err) {
    console.error("❌ Failed to fetch batch for TTL:", err);
    setEstimatedFinalTTL("Error calculating TTL");
  }
}
 else {
        setEstimatedFinalTTL(formatTTL(finalTTLSeconds));
      }

    } catch (err) {
      console.error("❌ Error in dilution preview:", err);
      setTopupCost({ totalPlur: "0", totalXBZZ: "0.00000000" });
      setEstimatedFinalTTL("0d 0h 0m");
      setPlurPerChunk(0);
    }
  };

  fetchCost();
}, [beeApiUrl, batch, newDepth, dilutionTTL]);

  /**
   * 🧾 Handle wallet check, top-up (if needed), and dilution
   */
  const handleDiluteBatch = async () => {
    setStatus("⏳ Checking Wallet Balance...");
    setShowConfirmation(false);

    try {
      const walletData = await fetchWalletBalance(beeApiUrl);
      const xBZZBalance = parseFloat(walletData.bzzBalance.replace(" xBZZ", ""));

      const totalPlurFloat = parseFloat(topupCost.totalPlur);
      const requiredXBZZFloat = totalPlurFloat / 1e16;

      // ✅ Check wallet balance before proceeding
      if (xBZZBalance < requiredXBZZFloat) {
        setStatus(`❌ Insufficient xBZZ. Required: ${requiredXBZZFloat.toFixed(8)} xBZZ. Available: ${xBZZBalance.toFixed(8)} xBZZ.`);
        return;
      }

      setStatus("⏳ Processing Top-Up...");

      const topupAmount = Math.ceil(totalPlurFloat); // safest if you know it's already integer

      const bee = new Bee(beeApiUrl);

      if (topupAmount > 0) {
        try {
          // 🐝 Send top-up using Bee JS
          console.log("✅ Sending Top-Up:", topupAmount, "PLUR per chunk");
          await bee.topUpBatch(batch.batchID, BigInt(topupAmount));
          setStatus("✅ Top-Up Successful. Proceeding with Dilution...");
        } catch (err) {
          console.error("❌ Top-Up Error:", err);
          setStatus("❌ Top-Up failed. " + (err.message || ""));
          return;
        }
      } else {
        console.log("ℹ️ No top-up required. Proceeding with dilution only.");
      }


      try {
        // 🐝 Dilute batch to new depth
        await bee.diluteBatch(batch.batchID, parseInt(newDepth));
        setStatus("✅ Dilution Successful.");
        onDiluteSuccess(); // Notify parent
      } catch (err) {
        console.error("❌ Dilution Error:", err);
        setStatus("❌ Dilution failed. " + (err.message || ""));
      }

    } catch (error) {
      console.error("❌ Wallet or API Error:", error);
      setStatus("❌ Error occurred during top-up or dilution.");
    }
  };

  return (
    <div className="dilution-popup-overlay">
      <div className="dilution-popup">
        <h2>Dilute Batch - Increase Capacity</h2>
        <p>Current Batch: {batch.label || "Unnamed"} (Depth: {batch.depth})</p>
        <p>Current TTL: {formatTTL(batch.ttl)}</p>
        <p>Selected File Size: {fileSizeMB.toFixed(2)} MB</p>
        <p>Calculated New Depth: {newDepth}</p>

        {/* TTL Selection */}
        <label>Set New TTL:</label>
        <select
          value={dilutionTTL}
          onChange={(e) =>
            setDilutionTTL(
              e.target.value === 'none' || e.target.value === 'match'
                ? e.target.value
                : parseInt(e.target.value)
            )
          }
        >
          {TTL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Summary Section */}
        <p>Top-Up Cost: {parseFloat(topupCost.totalPlur).toLocaleString()} PLUR ({topupCost.totalXBZZ} xBZZ)</p>
        <p>PLUR Per Chunk: {plurPerChunk}</p>
        <p>Estimated TTL After Top-Up and Dilution: {estimatedFinalTTL}</p>

        {/* Action Buttons */}
        <div className="popup-actions">
          <button onClick={() => setShowConfirmation(true)} className="btn btn-primary">Confirm Dilution</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>

        {/* Final Confirmation */}
        {showConfirmation && (
          <div className="confirmation-popup-overlay">
            <div className="confirmation-popup">
              <h3>Confirm Top-Up and Dilution</h3>
              <p>Total Top-Up Cost: {parseFloat(topupCost.totalPlur).toLocaleString()} PLUR ({topupCost.totalXBZZ} xBZZ)</p>
              <p>PLUR Per Chunk: {plurPerChunk}</p>
              <p>New Depth: {newDepth}</p>
              <div className="popup-actions">
                <button onClick={handleDiluteBatch} className="btn btn-primary">Confirm</button>
                <button className="btn btn-secondary" onClick={() => setShowConfirmation(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Status Feedback */}
        {status && <p className="status-message">{status}</p>}
      </div>
    </div>
  );
}
