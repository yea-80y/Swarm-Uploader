import { useState, useEffect } from "react";
import './styles.css';

// Converts BZZ from PLUR units to readable xBZZ
function formatBzz(plur) {
  return (parseFloat(plur) / 10 ** 16).toFixed(4) + " xBZZ";
}

// Maps depth → effective volume (MB) using Swarm’s medium erasure coding
const EFFECTIVE_VOLUME_MEDIUM_MB = {
  17: 0.04156, 18: 6.19, 19: 104.18, 20: 639.27, 21: 2410, 22: 7180,
  23: 18540, 24: 43750, 25: 98090, 26: 211950, 27: 443160, 28: 923780,
  29: 1900000, 30: 3880000, 31: 7860000, 32: 15870000, 33: 31940000,
  34: 64190000, 35: 128800000, 36: 258190000, 37: 517230000,
  38: 1040000000, 39: 2070000000, 40: 4150000000, 41: 8300000000
};

export default function BeeConnection({
  beeApiUrl,
  setBeeApiUrl,
  wallet,
  setWallet,
  batches,
  setBatches
}) {
  const [nodeType, setNodeType] = useState("dappnode");
  const [manualUrl, setManualUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

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
            Dappnode
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
            Local
          </label>
          <label>
            <input
              type="radio"
              value="manual"
              checked={nodeType === "manual"}
              onChange={() => setNodeType("manual")}
            />
            Manual
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

        <button onClick={handleConnect} className="btn btn-primary">
          Connect
        </button>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="btn btn-toggle"
        >
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
            <p><strong>Available Batches:</strong></p>
            <ul>
              {batches.map(batch => {
                const effectiveMB = EFFECTIVE_VOLUME_MEDIUM_MB[batch.depth] || 0;
                const usedMB = (batch.utilization * 4096) / (1024 * 1024);
                const remainingMB = Math.max(effectiveMB - usedMB, 0);
                const ttlDays = Math.round((batch.batchTTL || 0) / 86400);

                return (
                  <li key={batch.batchID}>
                    <strong>{batch.label || "(no label)"}</strong><br />
                    ID: <code>{batch.batchID.slice(0, 12)}...</code><br />
                    Depth: {batch.depth} → Capacity: {effectiveMB.toFixed(2)} MB<br />
                    Used: {usedMB.toFixed(2)} MB<br />
                    Remaining: {remainingMB.toFixed(2)} MB<br />
                    TTL: {ttlDays} days
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
