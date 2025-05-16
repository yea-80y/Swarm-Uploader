// DilutionPopup.jsx (Improved UI with Dynamic Cost Calculation)
import React, { useState, useEffect } from "react";
import "./styles.css";
import { calculateTopupCost, diluteBatch, formatTTL, EFFECTIVE_VOLUME_MEDIUM_MB } from "./BeeConnection"; // ✅ Import functions

export default function DilutionPopup({ beeApiUrl, batch, onClose, onDiluteSuccess, fileSizeMB }) {
  const [dilutionTTL, setDilutionTTL] = useState(31536000); // Default to 1 year (in seconds)
  const [topupCost, setTopupCost] = useState({ totalPlur: "0.00000000", totalXBZZ: "0.00000000" });
  const [newDepth, setNewDepth] = useState(batch.depth); // Start with the current depth
  const [status, setStatus] = useState(null);

  // ✅ Automatically Calculate the Required Depth Based on File Size
  useEffect(() => {
    // Calculate the required depth for the given file size
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
      console.log("🔎 Calculated Top-Up Cost:", cost);
      setTopupCost(cost);
    };
    fetchCost();
  }, [beeApiUrl, batch, dilutionTTL, newDepth]);

  const handleDiluteBatch = async () => {
    setStatus("⏳ Processing dilution...");
    const depthIncrease = newDepth - batch.depth; // ✅ Correctly calculates the increase

    // Calculate top-up cost for the selected TTL
    const result = await diluteBatch(beeApiUrl, batch.batchID, depthIncrease, parseInt(topupCost.totalPlur));
    setStatus(result.message);
    
    if (result.success) {
      onDiluteSuccess();
      setTimeout(onClose, 2000); // Auto-close after 2 seconds
    }
  };

  return (
    <div className="dilution-popup-overlay">
      <div className="dilution-popup">
        <h2>Dilute Batch - Increase Capacity</h2>
        <p>Current Batch: {batch.label} (Depth: {batch.depth})</p>
        <p>Current TTL: {formatTTL(batch.ttl)}</p>
        <p>Selected File Size: {fileSizeMB} MB</p>

        {/* ✅ Display Calculated New Depth */}
        <p>Calculated New Depth: {newDepth}</p>

        {/* ✅ Set TTL (Match Current TTL or Custom) */}
        <label>Set New TTL:</label>
        <select value={dilutionTTL} onChange={(e) => setDilutionTTL(parseInt(e.target.value))}>
          <option value="match">Match Current TTL ({formatTTL(batch.ttl)})</option>
          <option value={93600}>26 Hours</option>
          <option value={604800}>1 Week</option>
          <option value={2592000}>1 Month</option>
          <option value={31536000}>1 Year</option>
        </select>

        {/* ✅ Display the Calculated Top-Up Cost */}
        <p>Top-Up Cost: {topupCost.totalPlur} PLUR ({topupCost.totalXBZZ} xBZZ)</p>

        {/* ✅ Clear Explanation for the User */}
        <p>The top-up cost is calculated to ensure your batch maintains the desired TTL even after dilution (increased capacity).</p>

        <div className="popup-actions">
          <button onClick={handleDiluteBatch} className="btn btn-primary">Confirm Dilution</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>

        {status && <p className="status-message">{status}</p>}
      </div>
    </div>
  );
}
