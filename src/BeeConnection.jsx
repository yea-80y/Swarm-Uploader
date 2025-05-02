import { useState } from "react";
import './styles.css';

function formatBzz(plur) {
  return (parseFloat(plur) / 10 ** 16).toFixed(4) + " xBZZ";
}

const EFFECTIVE_VOLUME_MEDIUM_MB = {
  17: 0.04156,
  18: 6.19,
  19: 104.18,
  20: 639.27,
  21: 2410,
  22: 7180,
  23: 18540,
  24: 43750,
  25: 98090,
  26: 211950,
  27: 443160,
  28: 923780,
  29: 1900000,
  30: 3880000,
  31: 7860000,
  32: 15870000,
  33: 31940000,
  34: 64190000,
  35: 128800000,
  36: 258190000,
  37: 517230000,
  38: 1040000000,
  39: 2070000000,
  40: 4150000000,
  41: 8300000000
};

export default function BeeConnection() {
  const [nodeType, setNodeType] = useState("dappnode");
  const [beeApiUrl, setBeeApiUrl] = useState("http://bee.swarm.public.dappnode:1633");
  const [manualUrl, setManualUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isImmutable, setIsImmutable] = useState(true);  // default to immutable
// Helper: estimate how many chunks the file will use
  const estimateChunksNeeded = (fileSizeBytes) => {
    const CHUNK_SIZE = 4096; // 4KB
    return Math.ceil(fileSizeBytes / CHUNK_SIZE);
  };
  
  const fileName = file?.name || "";
  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : null;
  const estimatedChunks = file ? estimateChunksNeeded(file.size) : 0;
  
  const selectedBatchInfo = batches.find(b => b.batchID === selectedBatch);
  const batchDepth = selectedBatchInfo?.depth || null;
  const effectiveMB = batchDepth ? EFFECTIVE_VOLUME_MEDIUM_MB[batchDepth] || 0 : 0;
  const effectiveChunks = Math.floor((effectiveMB * 1024 * 1024) / 4096);
  const batchUsed = selectedBatchInfo?.utilization || 0;
  const batchRemaining = effectiveChunks - batchUsed;
  const canUpload = batchRemaining >= estimatedChunks;
  

  const handleConnect = async () => {
    let url = beeApiUrl;
    if (nodeType === "manual" && manualUrl) {
      url = manualUrl;
    }

    try {
      const response = await fetch(`${url}/health`);
      if (!response.ok) throw new Error("Health check failed");

      const data = await response.json();
      setStatus(`✅ Connected! Bee version: ${data.version}`);

      const walletRes = await fetch(`${url}/wallet`);
      const walletData = await walletRes.json();
      setWallet(walletData);

      const stampsRes = await fetch(`${url}/stamps`);
      const stampsData = await stampsRes.json();
      setBatches((stampsData.stamps || []).sort((a, b) => b.blockNumber - a.blockNumber));

    } catch (err) {
      console.error(err);
      setStatus("❌ Could not connect. Error contacting Bee node.");
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedBatch) return;
  
    const queryParams = new URLSearchParams({
        name: file.name,
        immutable: isImmutable.toString()
      });      
  
    try {
      setUploadStatus("Uploading...");
  
      const res = await fetch(`${beeApiUrl}/bzz?${queryParams}`, {
        method: "POST",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Swarm-Postage-Batch-Id": selectedBatch
        }
      });
  
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
  
      const reference = await res.text();
      setUploadStatus(`✅ Uploaded! Swarm hash: ${reference}`);
    } catch (err) {
      console.error(err);
      setUploadStatus("❌ Upload failed: " + err.message);
    }
  };  

  return (
    <div className={`app-container ${darkMode ? "dark" : "light"}`}>
      <div className={`card ${darkMode ? "dark" : "light"}`}>
        <h1 className="title">Connect to Bee Node</h1>

        <div className="radio-group">
          <label>
            <input
              type="radio"
              value="dappnode"
              checked={nodeType === "dappnode"}
              onChange={() => {
                setNodeType("dappnode");
                setBeeApiUrl("http://bee.swarm.public.dappnode:1633");
              }}
            />
            {" "}Dappnode
          </label>
          <label>
            <input
              type="radio"
              value="local"
              checked={nodeType === "local"}
              onChange={() => {
                setNodeType("local");
                setBeeApiUrl("http://localhost:1633");
              }}
            />
            {" "}Local
          </label>
          <label>
            <input
              type="radio"
              value="manual"
              checked={nodeType === "manual"}
              onChange={() => setNodeType("manual")}
            />
            {" "}Manual
          </label>
        </div>

        {nodeType === "manual" && (
          <input
            className="manual-url"
            placeholder="Enter Bee API URL"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
          />
        )}

        <button onClick={handleConnect} className={`btn btn-primary ${darkMode ? "dark" : ""}`}>
          Connect
        </button>

        <button onClick={() => setDarkMode(!darkMode)} className={`btn btn-toggle ${darkMode ? "dark" : ""}`}>
          Toggle {darkMode ? "Light" : "Dark"} Mode
        </button>

        {status && <p className="status-msg">{status}</p>}

        {wallet && (
          <div className="wallet-info">
            <p><strong>Wallet BZZ Balance:</strong> {formatBzz(wallet.bzzBalance)}</p>
            <p><strong>Ethereum Address:</strong> {wallet.ethereumAddress || wallet.chequebookAddress || wallet.address || "(not available)"}</p>
          </div>
        )}

        {batches.length > 0 && (
          <div className="batch-list">
            <p><strong>Existing Batches:</strong></p>
            <ul>
              {batches.map(batch => {
                const name = batch.label || "(no label)";
                const depth = batch.depth;
                const used = batch.utilization;
                const effectiveMB = EFFECTIVE_VOLUME_MEDIUM_MB[depth] || 0;
                const capacityReadable = effectiveMB >= 1024
                  ? (effectiveMB / 1024).toFixed(2) + " GB"
                  : effectiveMB.toFixed(2) + " MB";
                const ttlDays = Math.round((batch.batchTTL || 0) / 86400);

                return (
                  <li key={batch.batchID}>
                    <strong>{name}</strong><br />
                    ID: <code>{batch.batchID.slice(0, 12)}...</code><br />
                    Depth: {depth} → Capacity: {capacityReadable}<br />
                    Used: {(used * 4096 / 1024 / 1024).toFixed(2)} MB<br />
                    Remaining: {(batchRemaining * 4096 / 1024 / 1024).toFixed(2)} MB<br />
                    TTL: {ttlDays} days
                  </li>
                );
              })}
            </ul>
          </div>
        )}
          <div className="upload-form">
            <h3>Upload a File</h3>

            <label>Select batch:</label><br />
            <select
                className="select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
  >
            <option value="">-- Choose a batch --</option>
                {batches.map(batch => (
            <option key={batch.batchID} value={batch.batchID}>
                {batch.label || "(no label)"} – {batch.batchID.slice(0, 8)}...
            </option>
        ))}
            </select>

            <label>File:</label><br />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="file-input"
         />
          
          {file && (
            <div className="file-details">
            <p><strong>File:</strong> {fileName}</p>
            <p><strong>Size:</strong> {fileSizeMB} MB</p>
            {selectedBatch && (
              <>
                <p><strong>Remaining in batch:</strong> {(batchRemaining * 4096 / 1024 / 1024).toFixed(2)} MB</p>
                {!canUpload && (
                  <p style={{ color: "red" }}>
                    ⚠️ This file is too large for the selected batch. Please choose another batch or create a new one.
                  </p>
                )}
              </>
            )}
                </div>
            )}


            <label className="checkbox">
          <input
            type="checkbox"
            checked={isImmutable}
            onChange={() => setIsImmutable(!isImmutable)}
    />
        Immutable upload
        </label>

        <button
            onClick={handleUpload}
            className="btn btn-primary"
            disabled={!file || !selectedBatch || !canUpload}
  >
        Upload to Swarm
        </button>

        {uploadStatus && <p className="status-msg">{uploadStatus}</p>}
        </div>

        
      </div>
    </div>
  );
}
