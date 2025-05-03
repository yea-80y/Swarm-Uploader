import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Mapping from batch depth to effective capacity in MB (for Medium erasure coding)
const EFFECTIVE_VOLUME_MEDIUM_MB = {
  17: 0.04156, 18: 6.19, 19: 104.18, 20: 639.27,
  21: 2410, 22: 7180, 23: 18540, 24: 43750,
  25: 98090, 26: 211950, 27: 443160, 28: 923780,
  29: 1900000, 30: 3880000, 31: 7860000, 32: 15870000,
  33: 31940000, 34: 64190000, 35: 128800000, 36: 258190000,
  37: 517230000, 38: 1040000000, 39: 2070000000,
  40: 4150000000, 41: 8300000000
};

export default function UploadScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // Destructure passed state
  const beeApiUrl = state?.beeApiUrl;
  const wallet = state?.wallet;
  const batches = state?.batches;

  const [file, setFile] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [isImmutable, setIsImmutable] = useState(true);
  const [uploadStatus, setUploadStatus] = useState("");

  // Block access if user arrived without connection
  if (!beeApiUrl || !wallet || !batches) {
    return (
      <div className="app-container">
        <div className="card">
          <h2>❌ Not connected</h2>
          <p>Please connect to your Bee node first.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            ← Return to Connection
          </button>
        </div>
      </div>
    );
  }

  // Upload handler
  const handleUpload = async () => {
    try {
      setUploadStatus("Uploading...");

      const res = await fetch(`${beeApiUrl}/bzz?name=${file.name}&immutable=${isImmutable}`, {
        method: "POST",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Swarm-Postage-Batch-Id": selectedBatch
        }
      });

      if (!res.ok) throw new Error(await res.text());
      const ref = await res.text();
      setUploadStatus(`✅ Uploaded! Swarm Hash: ${ref}`);
    } catch (err) {
      setUploadStatus("❌ Upload failed: " + err.message);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>Upload to Swarm</h1>

        <button className="btn-secondary" onClick={() => navigate("/")}>
          ← Back to Connection
        </button>

        {/* File input */}
        <label>File:</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="file-input"
        />

        {/* Batch selection */}
        <div className="batch-list">
          <p><strong>Select a Batch:</strong></p>
          <ul>
            {batches.map((batch) => {
              const name = batch.label || "(no label)";
              const depth = batch.depth;
              const ttlDays = Math.round((batch.batchTTL || 0) / 86400);

              const usedChunks = batch.utilization || 0;
              const effectiveMB = EFFECTIVE_VOLUME_MEDIUM_MB[depth] || 0;
              const usedMB = (usedChunks * 4096) / (1024 * 1024);
              const remainingMB = effectiveMB - usedMB;

              const isSelected = batch.batchID === selectedBatch;

              return (
                <li
                  key={batch.batchID}
                  className={`batch-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedBatch(batch.batchID)}
                >
                  <strong>{name}</strong><br />
                  ID: <code>{batch.batchID.slice(0, 12)}...</code><br />
                  Depth: {depth} → Capacity: {effectiveMB.toFixed(2)} MB<br />
                  Used: {usedMB.toFixed(2)} MB<br />
                  Remaining: {remainingMB.toFixed(2)} MB<br />
                  TTL: {ttlDays} days
                </li>
              );
            })}
          </ul>
        </div>

        {/* File preview */}
        {file && (
          <div className="file-details">
            <p><strong>Selected:</strong> {file.name}</p>
            <p><strong>Size:</strong> {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        )}

        {/* Immutable toggle */}
        <label>Immutable:</label>
        <input
          type="checkbox"
          checked={isImmutable}
          onChange={() => setIsImmutable(!isImmutable)}
        />

        {/* Upload button */}
        <button
          className="btn btn-primary"
          style={{ marginTop: "20px", fontSize: "18px", padding: "12px 20px" }}
          onClick={handleUpload}
          disabled={!file || !selectedBatch}
        >
          Upload to Swarm
        </button>

        {/* Status display */}
        {uploadStatus && <p>{uploadStatus}</p>}
      </div>
    </div>
  );
}
