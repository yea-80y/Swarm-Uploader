// UploadScreen.jsx 
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bee } from "@ethersphere/bee-js";
import { keccak256 } from "js-sha3";
import "./styles.css";
import { calculateCapacity, fetchBatchTTL, formatTTL } from "./BeeConnection";
import DilutionPopup from "./DilutionPopup";

// Helper: Generate a 64-character Hex String for Feed Topic
function generateTopicHex(feedName) {
  const hashHex = keccak256(feedName);
  const topicHex = hashHex.padStart(64, '0');
  console.log("Generated Topic Hex for Feed (64-char Hex, No 0x):", topicHex);
  return topicHex;
}

// Helper: Set Timeout for API Requests (Prevent Stuck State)
const timeout = (promise, ms) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export default function UploadScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const beeApiUrl = state?.beeApiUrl;
  const wallet = state?.wallet;

  const [batches, setBatches] = useState([]);
  const [uploadMode, setUploadMode] = useState("file");
  const [file, setFile] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [isImmutable, setIsImmutable] = useState(true);
  const [uploadStatus, setUploadStatus] = useState("");
  const [feedName, setFeedName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedManifestHash, setFeedManifestHash] = useState("");
  const [swarmHash, setSwarmHash] = useState("");
  const [feedTopicHex, setFeedTopicHex] = useState("");
  const [monitoringFeed, setMonitoringFeed] = useState(false);
  const [showDilutionPopup, setShowDilutionPopup] = useState(false);
  const [fileSizeMB, setFileSizeMB] = useState(0); // ✅ Add this state for file size

  const bee = new Bee(beeApiUrl);
    
  
  console.log("✅ Bee API URL:", beeApiUrl);
  
  // Fetch Batches (Now Using Centralized Capacity and TTL)
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await fetch(`${beeApiUrl}/stamps`);
        const data = await response.json();
        
        const usableBatches = await Promise.all(
          data.stamps.filter(batch => batch.usable).map(async (batch) => {
            const ttl = await fetchBatchTTL(beeApiUrl, batch.batchID);
            return {
              ...batch,
              capacity: calculateCapacity(batch.depth),
              ttl: ttl,
            };
          })
        );

        if (usableBatches.length === 0) {
          console.log("❌ No usable batches found.");
        } else {
          console.log("✅ Usable Batches with Capacity and TTL:", usableBatches);
        }

        setBatches(usableBatches);
      } catch (err) {
        console.error("❌ Error fetching batches:", err);
        setUploadStatus("❌ Failed to fetch live batch data.");
      }
    };

    fetchBatches();
  }, [beeApiUrl]);

  // ✅ Handle File Selection (Fixed Capacity Check)
  const handleFileChange = (e) => {
    const files = e.target.files;
    let totalSizeMB = 0;

    if (uploadMode === "folder") {
      totalSizeMB = Array.from(files).reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
      setFile(files);
      console.log("✅ Folder Selected:", files);
    } else {
      totalSizeMB = files[0]?.size / (1024 * 1024); // File Size in MB
      setFile(files[0]);
      console.log("✅ File Selected:", files[0]?.name);
    }

    console.log("✅ Total Upload Size:", totalSizeMB, "MB");
    setFileSizeMB(totalSizeMB); // ✅ Correctly store the file size

    const batch = batches.find(b => b.batchID === selectedBatch);
    if (!batch) {
      setUploadStatus("❌ Selected batch not found.");
      setShowDilutionPopup(false); // ✅ Ensure Popup is Hidden if No Batch
      return;
    }

    console.log("✅ Selected Batch Capacity:", batch.capacity, "MB");

    // ✅ Check if the file size exceeds the batch capacity (Corrected)
    if (totalSizeMB > parseFloat(batch.capacity)) {
      setUploadStatus("❌ Total size exceeds batch capacity.");
      setShowDilutionPopup(true); // ✅ Trigger Popup for Dilution Only if Needed
    } else {
      setShowDilutionPopup(false); // ✅ Hide Popup if Capacity is Sufficient
      setUploadStatus(""); // Clear any existing status if capacity is sufficient
    }
  };




  // Automatic Feed Monitoring
  useEffect(() => {
    let interval;
    if (monitoringFeed && feedUrl) {
      interval = setInterval(async () => {
        console.log("🔎 Checking Feed State...");
        const response = await fetch(feedUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.reference) {
            console.log("✅ Feed Updated: Reference:", data.reference);
            setUploadStatus(`✅ Feed Updated: ${data.reference}`);
            setMonitoringFeed(false);
            clearInterval(interval);
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [monitoringFeed, feedUrl]);


  // Handle Upload
    const handleUpload = useCallback(async () => {
      if (!file || !selectedBatch) {
        setUploadStatus("❌ Please select a batch and file.");
        return;
      }


    setUploadStatus("Uploading...");
    setSwarmHash("");
    setFeedManifestHash("");
    setFeedTopicHex("");
    setMonitoringFeed(false);
    setUploadProgress(0); // ✅ Progress Reset

    try {
      const batch = batches.find(b => b.batchID === selectedBatch);
      if (!batch) throw new Error("Selected batch not found.");

      const isBatchMutable = !batch.immutableFlag;

      // ✅ Immutable Type Check
      if (isImmutable !== !isBatchMutable) {
        setUploadStatus("❌ Upload failed: File type does not match batch type.");
        return;
      }

      let reference = "";

      if (uploadMode === "file") {
        const result = await bee.uploadFile(selectedBatch, file);
        reference = result.reference.toString();
      } else {
        const result = await bee.uploadFiles(selectedBatch, file, { indexDocument: "index.html" });
        reference = result.reference.toString();
      }

      setSwarmHash(reference);
      setUploadStatus(`✅ Uploaded Successfully!`);

      if (!isImmutable && isBatchMutable) {
        const topicHex = generateTopicHex(feedName);
        setFeedTopicHex(topicHex);
        const signer = createSigner();
        const feedUrlFull = `${beeApiUrl}/feeds/${signer.address}/${topicHex}?type=sequence`;
        setFeedUrl(feedUrlFull);

        const referenceBytes = new TextEncoder().encode(reference);
        const signature = await signer.sign(referenceBytes);

        await timeout(
          fetch(feedUrlFull, {
            method: "POST",
            headers: {
              "swarm-postage-batch-id": selectedBatch,
              "Content-Type": "application/octet-stream",
              "swarm-signer-address": signer.address,
              "swarm-signature": signature,
            },
            body: referenceBytes,
          }),
          10000
        );

        setMonitoringFeed(true);
      }
    } catch (err) {
      console.error("❌ Error:", err); // ✅ Error Logging
      setUploadStatus("❌ Upload failed: " + err.message);
      setUploadProgress(0); // ✅ Progress Reset
    }
  }, [file, selectedBatch, uploadMode, isImmutable, feedName, beeApiUrl, wallet, batches]);

  return (
    <div className="app-container">
      <div className="card">
        <h1>Upload to Swarm</h1>

        <h2>Select Batch:</h2>
        <div className="batch-list">
          {batches.length === 0 ? (
            <p>No available batches. Please buy a batch first.</p>
          ) : (
            batches.map((batch) => (
              <div 
                key={batch.batchID} 
                className={`batch-card ${selectedBatch === batch.batchID ? "selected" : ""}`} 
                onClick={() => { 
                  setSelectedBatch(batch.batchID); 
                  setIsImmutable(batch.immutableFlag);
                }}>
                <strong>{batch.label || "(No Label)"}</strong><br />
                ID: {batch.batchID}<br />
                Type: {batch.immutableFlag ? "Immutable" : "Mutable"}<br />
                Capacity: {batch.capacity !== "Unknown" ? `${batch.capacity} MB` : "Calculating..."}<br />
                TTL: {batch.ttl !== "Unknown" ? formatTTL(batch.ttl) : "Calculating..."}
              </div>
            ))
          )}
        </div>

        <label>Upload Mode:</label>
        <select value={uploadMode} onChange={(e) => setUploadMode(e.target.value)}>
          <option value="file">File</option>
          <option value="folder">Folder (Website)</option>
        </select>

        <label>Select File:</label>
        <input 
          type="file" 
          {...(uploadMode === "folder" ? { webkitdirectory: "true", directory: "true" } : {})} 
          multiple={uploadMode === "folder"} 
          onChange={handleFileChange} 
        />


        <label>Immutable:</label>
        <input type="checkbox" checked={isImmutable} onChange={() => setIsImmutable(!isImmutable)} />

        {uploadMode === "folder" && !isImmutable && (
          <div>
            <label>Feed Name (Required):</label>
            <input type="text" value={feedName} onChange={(e) => setFeedName(e.target.value)} required />
          </div>
        )}

        <button onClick={handleUpload}>Upload to Swarm</button>
        {uploadStatus && <p>{uploadStatus}</p>}
        {swarmHash && (
          <>
            <p>✅ Swarm Hash: <code>{swarmHash}</code></p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate("/ens-update", { state: { swarmHash } })}
            >
              Update ENS Content Hash
            </button>
          </>
        )}


        {showDilutionPopup && (
          <DilutionPopup 
            beeApiUrl={beeApiUrl} 
            batch={batches.find(b => b.batchID === selectedBatch)}
            fileSizeMB={fileSizeMB} // ✅ Pass file size to DilutionPopup 
            onClose={() => setShowDilutionPopup(false)} 
            onDiluteSuccess={() => {
              setShowDilutionPopup(false);
              setUploadStatus("✅ Batch diluted successfully. You can now upload.");
            }}
          />
        )}
      </div>
    </div>
  );
}
