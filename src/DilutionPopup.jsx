import React, { useState, useEffect } from "react";
import "./styles.css";
import { calculateTopupCost, formatTTL, EFFECTIVE_VOLUME_MEDIUM_MB } from "./BeeConnection"; // ✅ Import functions

export default function DilutionPopup({ beeApiUrl, batch, onClose, onDiluteSuccess, fileSizeMB }) {
  const [dilutionTTL, setDilutionTTL] = useState(31536000); // Default to 1 year (in seconds)
  const [topupCost, setTopupCost] = useState({ totalPlur: "0.00000000", totalXBZZ: "0.00000000" });
  const [newDepth, setNewDepth] = useState(batch.depth); // Start with the current depth
  const [status, setStatus] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [estimatedFinalTTL, setEstimatedFinalTTL] = useState("0d 0h 0m");

  // ✅ Automatically Calculate the Required Depth Based on File Size
  useEffect(() => {
    let requiredDepth = batch.depth;
    while (fileSizeMB > EFFECTIVE_VOLUME_MEDIUM_MB[requiredDepth] && requiredDepth < 35) {
      requiredDepth++;
    }
    setNewDepth(requiredDepth);
  }, [fileSizeMB, batch.depth]);

  // ✅ Calculate Top-Up Cost Dynamically (Updated Logic)
  useEffect(() => {
    const fetchCost = async () => {
      const cost = await calculateTopupCost(beeApiUrl, batch.batchID, newDepth, dilutionTTL);
      
     // ✅ Use BigInt for Accurate PLUR Calculation
      try {
        const totalPlurBigInt = BigInt(cost.totalPlur);
        cost.totalPlur = totalPlurBigInt.toString();
        cost.totalXBZZ = (parseFloat(totalPlurBigInt.toString()) / 1e16).toFixed(8);
      } catch (err) {
        console.error("❌ Error in PLUR Calculation:", err);
        cost.totalPlur = "0";
        cost.totalXBZZ = "0.00000000";
      }

      console.log("🔎 Calculated Top-Up Cost:", cost);
      setTopupCost(cost);

      // ✅ Calculate the Estimated TTL After Top-Up and Dilution
      const existingTTL = batch.ttl || 0;
      const finalTTLSeconds = dilutionTTL === "match" ? existingTTL : dilutionTTL + existingTTL;
      setEstimatedFinalTTL(formatTTL(finalTTLSeconds));
    };
    fetchCost();
  }, [beeApiUrl, batch, dilutionTTL, newDepth]);
  


 // ✅ Handle Dilution Process (Triggered after Confirmation)
const handleDiluteBatch = async () => {
  setStatus("⏳ Checking Wallet Balance...");
  setShowConfirmation(false);

  try {
      // ✅ Fetch Wallet Balance
      const walletResponse = await fetch(`${beeApiUrl}/wallet`);
      if (!walletResponse.ok) {
          setStatus("❌ Failed to fetch wallet balance. Please try again.");
          return;
      }

      const walletData = await walletResponse.json();
      const xBZZBalance = parseFloat(walletData.bzzBalance) / 1e16;

      // ✅ Log the Wallet Balance
      console.log("✅ Wallet Balance (xBZZ):", xBZZBalance);
      console.log("🔎 Calculated Total PLUR for Top-Up:", topupCost.totalPlur);

      // ✅ Calculate Required xBZZ (No BigInt Division)
      const totalPlurFloat = parseFloat(topupCost.totalPlur);
      const requiredXBZZ = (totalPlurFloat / 1e16).toFixed(8);

      // ✅ Log the Required xBZZ and Balance Check
      console.log("🔎 Required xBZZ for Top-Up:", requiredXBZZ);
      console.log("🔎 Available xBZZ Balance:", xBZZBalance.toFixed(8));

      if (xBZZBalance < parseFloat(requiredXBZZ)) {
          setStatus(`❌ Insufficient xBZZ Balance. Required: ${requiredXBZZ} xBZZ. Available: ${xBZZBalance.toFixed(8)} xBZZ.`);
          console.error("❌ Insufficient xBZZ Balance.");
          return;
      }

      setStatus("⏳ Processing Top-Up...");

      // ✅ Use BigInt for Accurate Top-Up Amount
      const topupAmount = BigInt(topupCost.totalPlur).toString();
      console.log("🔎 Top-Up Amount (PLUR - BigInt):", topupAmount);

      // ✅ Log API Request URL for Top-Up
      const topupUrl = `${beeApiUrl}/stamps/topup/${batch.batchID}/${topupAmount}`;
      console.log("🔎 API URL for Top-Up:", topupUrl);

      // ✅ Make Top-Up API Call
      const topupResponse = await fetch(topupUrl, {
          method: "PATCH",
      });

      if (!topupResponse.ok) {
          const errorMessage = await topupResponse.text();
          setStatus(`❌ Top-Up Failed: ${errorMessage}`);
          console.error("❌ Top-Up Error:", errorMessage);
          return;
      }

      const topupResult = await topupResponse.json();
      const topupTxHash = topupResult.transactionHash || "N/A";
      setStatus(`✅ Top-Up Successful (Tx: ${topupTxHash}). Processing Dilution...`);

      // ✅ Accurate Depth Value for Dilution
      const depthValue = parseInt(newDepth).toString();
      console.log("🔎 Dilution URL:", `${beeApiUrl}/stamps/dilute/${batch.batchID}/${depthValue}`);
      console.log("🔎 Dilution Depth Passed in API:", depthValue);

      // ✅ Make Dilution API Call
      const dilutionResponse = await fetch(`${beeApiUrl}/stamps/dilute/${batch.batchID}/${depthValue}`, {
          method: "PATCH",
      });

      if (!dilutionResponse.ok) {
          const errorMessage = await dilutionResponse.text();
          setStatus(`❌ Dilution Failed: ${errorMessage}`);
          console.error("❌ Dilution Error:", errorMessage);
          return;
      }

      const dilutionResult = await dilutionResponse.json();
      const dilutionTxHash = dilutionResult.transactionHash || "N/A";
      setStatus(`✅ Dilution Successful (Tx: ${dilutionTxHash}).`);
      onDiluteSuccess();
  } catch (error) {
      console.error("❌ Error during Top-Up or Dilution:", error);
      setStatus("❌ Error occurred during top-up or dilution. Please try again.");
  }
};


  return (
    <div className="dilution-popup-overlay">
      <div className="dilution-popup">
        <h2>Dilute Batch - Increase Capacity</h2>
        <p>Current Batch: {batch.label} (Depth: {batch.depth})</p>
        <p>Current TTL: {formatTTL(batch.ttl)}</p>
        <p>Selected File Size: {fileSizeMB} MB</p>
        <p>Calculated New Depth: {newDepth}</p>

        <label>Set New TTL:</label>
        <select value={dilutionTTL} onChange={(e) => setDilutionTTL(parseInt(e.target.value))}>
          <option value={93600}>26 Hours</option>
          <option value={604800}>1 Week</option>
          <option value={2592000}>1 Month</option>
          <option value={31536000}>1 Year</option>
        </select>

        <p>Top-Up Cost: {parseFloat(topupCost.totalPlur).toLocaleString()} PLUR ({topupCost.totalXBZZ} xBZZ)</p>
        <p>Estimated TTL After Top-Up and Dilution: {estimatedFinalTTL}</p>
        <div className="popup-actions">
          <button onClick={() => setShowConfirmation(true)} className="btn btn-primary">Confirm Dilution</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>

        {showConfirmation && (
          <div className="confirmation-popup-overlay">
            <div className="confirmation-popup">
              <h3>Confirm Top-Up and Dilution</h3>
              <p>Total Top-Up Cost: {parseFloat(topupCost.totalPlur).toLocaleString()} PLUR ({topupCost.totalXBZZ} xBZZ)</p>
              <p>New Depth: {newDepth}</p>
              <div className="popup-actions">
                <button onClick={handleDiluteBatch} className="btn btn-primary">Confirm</button>
                <button className="btn btn-secondary" onClick={() => setShowConfirmation(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {status && <p className="status-message">{status}</p>}
      </div>
    </div>
  );
}
