// UploadScreen.jsx 
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bee } from "@ethersphere/bee-js";
import { keccak256 } from "js-sha3";
import "../styles.css";
import { calculateCapacity, fetchBatchTTL, formatTTL, EFFECTIVE_VOLUME_MEDIUM_MB } from "../utils/BeeConnection";
import DilutionPopup from "../components/DilutionPopup";
import Header from "../components/Header"; // ✅ Import Header
import ThemeToggle from "../components/ThemeToggle"; // ✅ Import Toggle

// ✅ Function to Play Bee Sound
const playBeeSound = () => {
  const audioElement = document.getElementById("bee-sound");
  if (audioElement) {
    audioElement.play();
  }
};

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
  const beeApiUrl = location.state?.beeApiUrl || "http://bee.swarm.public.dappnode:1633"
  const wallet = state?.wallet;

  const [batches, setBatches] = useState([]);
  const [uploadMode, setUploadMode] = useState("file");
  const [file, setFile] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [isImmutable, setIsImmutable] = useState(true);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [swarmHash, setSwarmHash] = useState("");
  const [showDilutionPopup, setShowDilutionPopup] = useState(false);
  const [fileSizeMB, setFileSizeMB] = useState(0); // ✅ Add this state for file size
  const [formattedFileSize, setFormattedFileSize] = useState(""); // ✅ New state
  const [feedName, setFeedName] = useState(""); // ✅ Add this back to avoid ReferenceError
  // 🔐 Bee encryption toggle
  const [encryptionMode, setEncryptionMode] = useState('bee'); // 'bee' | 'none'
  const isBeeEncrypted = encryptionMode === 'bee';

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
              capacityMB: EFFECTIVE_VOLUME_MEDIUM_MB[batch.depth] || 0, // ✅ define it inline here
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
    // 1) Preserve folder structure; strip off the leading "dist/" folder
    const fileArray = Array.from(files).map(f => {
      const fullPath = f.webkitRelativePath || f.name;              // e.g. "dist/assets/index-ABC.js"
      const relativePath = fullPath.startsWith('dist/')
        ? fullPath.slice(5)                                         // remove "dist/"
        : fullPath;
      return new File([f], relativePath, { type: f.type });
    });
    console.log("✅ Folder Selected (with paths):", fileArray.map(f => f.name));
    
    // 2) Compute total size
    totalSizeMB = fileArray.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
    setFile(fileArray);
  }
 else {
      // single-file mode
      const single = files[0];
      console.log("✅ File Selected:", single.name);
      totalSizeMB = single.size / (1024 * 1024);
      setFile(single);
    }

    // 3) Shared capacity check
    console.log("✅ Total Upload Size:", totalSizeMB, "MB");
    setFileSizeMB(totalSizeMB);

    const formatted = `${totalSizeMB.toFixed(2)} MB`;
    setFormattedFileSize(formatted);

    const batch = batches.find(b => b.batchID === selectedBatch);
    if (!batch) {
      setUploadStatus("❌ Selected batch not found.");
      setShowDilutionPopup(false);
      return;
    }
    console.log("✅ Selected Batch Capacity:", batch.capacity, "MB");

    if (totalSizeMB > batch.capacityMB) {
      setUploadStatus("❌ Total size exceeds batch capacity.");
      setShowDilutionPopup(true);
    } else {
      setShowDilutionPopup(false);
      setUploadStatus("");
    }
  };


  // ✅ Handle Upload
  const handleUpload = useCallback(async () => {
    if (!file || !selectedBatch) {
      setUploadStatus("❌ Please select a batch and file.");
      return;
    }

    setUploadStatus("Uploading...");
    setSwarmHash("");
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
        const result = await bee.uploadFile(selectedBatch, file, file.name, {
        contentType: file.type || 'application/octet-stream',
        ...(isBeeEncrypted ? { encrypt: true } : {})
      });
        reference = result.reference.toString();
      } else {
        const result = await bee.uploadFiles(selectedBatch, file, {
        indexDocument: 'index.html',
        ...(isBeeEncrypted ? { encrypt: true } : {})
      });
        reference = result.reference.toString();
      }

      setSwarmHash(reference);
      setUploadStatus(`✅ Uploaded Successfully!`);
      playBeeSound(); // ✅ Play Bee Sound on Success
    } catch (err) {
      console.error("❌ Error:", err); // ✅ Error Logging
      setUploadStatus("❌ Upload failed: " + err.message);
      setUploadProgress(0); // ✅ Progress Reset
    }
  }, [file, selectedBatch, uploadMode, isImmutable, beeApiUrl, batches]);

  return (
    <div className="app-container">
    <Header /> {/* ✅ Top-Left Logo */}
    {/* ✅ Light/Dark Mode Toggle - Top-Right */}
          <div className="theme-toggle-container">
            <ThemeToggle />
          </div>
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
                Capacity: {batch.capacity !== "Unknown" ? batch.capacity : "Calculating..."}<br />
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

        {/* 🔐 Encrypt with Bee (user option) */}
        <div style={{ margin: "12px 0" }}>
          <label className="block text-sm font-medium mb-1">
            <input
              type="checkbox"
              checked={isBeeEncrypted}
              onChange={() =>
                setEncryptionMode(prev => (prev === "bee" ? "none" : "bee"))
              }
              style={{ marginRight: 8 }}
            />
            Encrypt with Bee
          </label>
          <p className="text-xs text-gray-500">
            When enabled, Bee stores your upload encrypted and returns a 64-byte (128-hex)
            reference that already includes the decryption key. Keep it private.
          </p>
        </div>

        <label>Select File:</label>
        <input 
          type="file" 
          {...(uploadMode === "folder" ? { webkitdirectory: "true", directory: "true" } : {})} 
          multiple={uploadMode === "folder"} 
          onChange={handleFileChange} 
        />
        <p><strong>Upload Size:</strong> {formattedFileSize}</p>

        <label>Immutable:</label>
        <input 
          type="checkbox" 
          checked={isImmutable} 
          onChange={() => setIsImmutable(!isImmutable)} 
        />
    
        {uploadMode === "folder" && !isImmutable && (
          <div>
            <label>Feed Name (Required):</label>
            <input 
              type="text" 
              value={feedName} 
              onChange={(e) => setFeedName(e.target.value)} 
              required 
              placeholder="Enter Feed Name for Website"
            />
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

            <button
              className="btn btn-secondary"
              onClick={() => navigate("/create-feed", { state: { beeApiUrl, swarmHash } })}
            >
              Create / Add to Feed
            </button>

            <button
              className="btn btn-secondary"
              onClick={() =>
                navigate("/pod-passport", {
                  state: {
                    beeApiUrl,           // reuse your current Bee API URL
                    reference: swarmHash, // the hash returned by the upload
                    // If you uploaded a folder/collection that contains the export JSON,
                    // set this to the file path inside the collection. For single-file uploads, leave empty.
                    collectionPath: uploadMode === "folder" ? "export.json" : ""
                  }
                })
              }
            >
              View POD Passport
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
        {/* ✅ Hidden Audio Element for Bee Sound */}
        <audio id="bee-sound" src="Bee.mp3" preload="auto"></audio>
      </div>
    </div>
  );
}
