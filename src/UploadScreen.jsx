// UploadScreen.jsx (Fully Corrected - Hex String for Feed Topic in Bee Writer)
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bee } from "@ethersphere/bee-js";
import { keccak256 } from "js-sha3";
import { getAddress } from "ethers";
import "./styles.css";

// Helper: Convert Uint8Array to hex string with 0x prefix
function uint8ArrayToHex(uint8arr) {
  return '0x' + Array.from(uint8arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function UploadScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const beeApiUrl = state?.beeApiUrl;
  const wallet = state?.wallet;
  const batches = state?.batches;

  const [uploadMode, setUploadMode] = useState("file");
  const [file, setFile] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [isImmutable, setIsImmutable] = useState(true);
  const [uploadStatus, setUploadStatus] = useState("");
  const [feedName, setFeedName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const bee = new Bee(beeApiUrl);

  // Handle File or Folder Selection
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (uploadMode === "folder") {
      setFile(files);
    } else {
      setFile(files[0]);
    }
  };

  // Handle File Upload
  const handleUpload = async () => {
    if (!file || !selectedBatch) {
      setUploadStatus("❌ Please select a batch and file.");
      return;
    }

    setUploadStatus("Uploading...");
    setUploadProgress(0);

    try {
      const batch = batches.find(b => b.batchID === selectedBatch);
      if (!batch) throw new Error("Selected batch not found.");

      const isBatchMutable = !batch.immutableFlag;
      console.log("Selected Batch Mutable:", isBatchMutable);
      if (isImmutable !== !isBatchMutable) {
        setUploadStatus("❌ Upload failed: File type does not match batch type.");
        return;
      }

      let reference = "";

      if (uploadMode === "file") {
        const result = await bee.uploadFile(selectedBatch, file, {
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        });
        reference = result.reference;
      } else {
        const result = await bee.uploadFiles(selectedBatch, file, {
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        });
        reference = result.reference;

        // If batch is mutable, update feed with website hash
        if (isBatchMutable) {
          try {
            const feedTopic = feedName || "website";
            const hashHex = keccak256(feedTopic); // 64-character hex string (no 0x)
            const topicHex = "0x" + hashHex;

            console.log("Feed Topic (Hex):", topicHex);
            console.log("Ethereum Address (Before Normalizing):", wallet.ethereumAddress);

            // Validate and normalize Ethereum address using ethers v6 getAddress()
            const normalizedAddress = getAddress(wallet.ethereumAddress);
            console.log("Ethereum Address (Normalized):", normalizedAddress);

            // Correct feed update using FeedWriter (Hex string with 0x prefix)
            const writer = bee.makeFeedWriter("sequence", topicHex, normalizedAddress);
            await writer.upload(reference);
            console.log("✅ Feed Updated Successfully");
          } catch (addressError) {
            setUploadStatus("❌ Feed update failed: Invalid Ethereum address or feed error.");
            console.error("Feed Update Error:", addressError);
            return;
          }
        }
      }

      setUploadStatus(`✅ Uploaded! Swarm Hash: ${reference}`);
      setUploadProgress(100);

    } catch (err) {
      setUploadStatus("❌ Upload failed: " + err.message);
      setUploadProgress(0);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>Upload to Swarm</h1>

        <h2>Select Batch:</h2>
        <div className="batch-list">
          {batches.map((batch) => (
            <div 
              key={batch.batchID} 
              className={`batch-card ${selectedBatch === batch.batchID ? "selected" : ""}`} 
              onClick={() => setSelectedBatch(batch.batchID)}
            >
              <strong>{batch.label || "(No Label)"}</strong><br />
              ID: {batch.batchID}<br />
              Type: {batch.immutableFlag ? "Immutable" : "Mutable"}<br />
              Capacity: {batch.capacity} - TTL: {batch.ttl}
            </div>
          ))}
        </div>

        <label>Upload Mode:</label>
        <select value={uploadMode} onChange={(e) => setUploadMode(e.target.value)}>
          <option value="file">File</option>
          <option value="folder">Folder</option>
        </select>

        <input 
          type="file" 
          webkitdirectory={uploadMode === "folder" ? "true" : undefined} 
          directory={uploadMode === "folder" ? "true" : undefined} 
          multiple={uploadMode === "folder"} 
          onChange={handleFileChange} 
        />

        <label>Immutable:</label>
        <input 
          type="checkbox" 
          checked={isImmutable} 
          onChange={() => setIsImmutable(!isImmutable)} 
        />

        {uploadMode === "folder" && !isImmutable && (
          <div>
            <label>Feed Name (Optional):</label>
            <input 
              type="text" 
              value={feedName} 
              onChange={(e) => setFeedName(e.target.value)} 
            />
          </div>
        )}

        <button onClick={handleUpload}>Upload to Swarm</button>
        {uploadStatus && <p>{uploadStatus}</p>}

        <div className="progress-bar">
          <div className="progress" style={{ width: `${uploadProgress}%` }}></div>
        </div>

        <button onClick={() => navigate("/")}>Back to Connection</button>
      </div>
    </div>
  );
}
