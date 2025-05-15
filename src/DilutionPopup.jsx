// DilutionPopup.jsx (With Corrected Styles Import)
import React, { useState } from "react";
import "./styles.css"; // ✅ Importing CSS for proper styling

export default function DilutionPopup({ batch, beeApiUrl, onClose, onDiluteSuccess }) {
  const [dilutionTTL, setDilutionTTL] = useState(31536000); // Default 1 year
  const [status, setStatus] = useState(null);

  const handleDiluteBatch = async () => {
    try {
      setStatus("⏳ Diluting batch...");
      // Top up the batch first to ensure TTL remains sufficient
      await fetch(`${beeApiUrl}/stamps/${batch.batchID}/topup`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: dilutionTTL,
        }),
      });

      // Dilute the batch by increasing the depth
      const response = await fetch(`${beeApiUrl}/stamps/${batch.batchID}/${batch.depth + 1}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.batchID) {
        setStatus("✅ Batch diluted successfully.");
        onDiluteSuccess();
        onClose();
      } else {
        setStatus("❌ Failed to dilute batch.");
      }
    } catch (err) {
      setStatus("❌ Error during batch dilution.");
    }
  };

  return (
    <div className="dilution-popup-overlay">
      <div className="dilution-popup">
        <h2>Dilute Batch - Increase Capacity</h2>
        <p>Current Batch: {batch.label} (Depth: {batch.depth})</p>

        <label>TTL (Storage Duration):</label>
        <select
          value={dilutionTTL}
          onChange={(e) => setDilutionTTL(parseInt(e.target.value))}
        >
          <option value={93600}>26 Hours</option>
          <option value={604800}>1 Week</option>
          <option value={2592000}>1 Month</option>
          <option value={31536000}>1 Year</option>
        </select>

        <div className="popup-actions">
          <button onClick={handleDiluteBatch} className="btn btn-primary">Confirm Dilution</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>

        {status && <p className="status-message">{status}</p>}
      </div>
    </div>
  );
}
