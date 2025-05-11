// UploadScreen.jsx (Fully Corrected - Strict Hex String for Bee-JS v9.2.1)
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bee } from "@ethersphere/bee-js";
import { keccak256 } from "js-sha3";
import "./styles.css";

// Helper: Generate a 64-character Hex String for Feed Topic
function generateTopicHex(feedName) {
  const hashHex = keccak256(feedName || "website");
  const topicHex = "0x" + hashHex.padStart(64, '0');

  console.log("Generated Topic Hex for Feed (64-char 0x Hex):", topicHex);

  if (typeof topicHex !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(topicHex)) {
    throw new Error("Invalid topic hex string format.");
  }

  return topicHex;
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

  // Handle File Selection
  const handleFileChange = (e) => {
    const files = e.target.files;
    setFile(uploadMode === "folder" ? files : files[0]);
  };

  // Create Ethereum Signer using window.ethereum (Metamask)
  const createSigner = () => {
    return {
      address: wallet.ethereumAddress,
      async sign(data) {
        const hexData = '0x' + Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [hexData, wallet.ethereumAddress],
        });
        return signature;
      },
    };
  };

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
      if (isImmutable !== !isBatchMutable) {
        setUploadStatus("❌ Upload failed: File type does not match batch type.");
        return;
      }

      let reference = "";

      if (uploadMode === "file") {
        const result = await bee.uploadFile(selectedBatch, file);
        reference = result.reference;
      } else {
        const result = await bee.uploadFiles(selectedBatch, file);
        reference = result.reference;

        if (isBatchMutable) {
          const topicHex = generateTopicHex(feedName);
          console.log("Using Topic Hex for Feed (64-char 0x Hex):", topicHex, "Type:", typeof topicHex);

          const signer = createSigner();
          console.log("Signer Created:", signer);

          // Using makeFeedWriter with Hex Topic
          const writer = await bee.makeFeedWriter("sequence", topicHex, signer);
          console.log("Feed Writer Created:", writer);

          await writer.upload(reference);
          console.log("Feed Updated with Reference:", reference);
        }
      }

      setUploadStatus(`✅ Uploaded! Swarm Hash: ${reference}`);
      setUploadProgress(100);

    } catch (err) {
      setUploadStatus("❌ Upload failed: " + err.message);
      console.error("❌ Error:", err);
      setUploadProgress(0);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>Upload to Swarm</h1>

        <h2>Select Batch:</h2>
        <div className="batch-list">
          {batches?.map((batch) => (
            <div 
              key={batch.batchID} 
              className={`batch-card ${selectedBatch === batch.batchID ? "selected" : ""}`} 
              onClick={() => {
                setSelectedBatch(batch.batchID);
                setIsImmutable(batch.immutableFlag);
              }}
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
        <input type="checkbox" checked={isImmutable} onChange={() => setIsImmutable(!isImmutable)} disabled={selectedBatch ? batches.find(b => b.batchID === selectedBatch)?.immutableFlag : false} />

        {uploadMode === "folder" && !isImmutable && (
          <div>
            <label>Feed Name (Optional):</label>
            <input type="text" value={feedName} onChange={(e) => setFeedName(e.target.value)} />
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
