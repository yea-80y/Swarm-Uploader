// ConnectionScreen.jsx (Fully Corrected - Two Navigation Buttons)
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWalletBalance, fetchPostageBatches } from "./BeeConnection";
import Header from "./Header"; // ✅ Import Header
import "./styles.css";
import ThemeToggle from "./ThemeToggle"; // ✅ Import Toggle

export default function ConnectionScreen() {
  const [beeApiUrl, setBeeApiUrl] = useState("http://bee.swarm.public.dappnode:1633");
  const [wallet, setWallet] = useState(null);
  const [batches, setBatches] = useState([]);
  const [status, setStatus] = useState(null);
  const [nodeType, setNodeType] = useState("dappnode");
  const [manualUrl, setManualUrl] = useState("");
  const navigate = useNavigate();


  const handleConnect = async () => {
    let url = beeApiUrl;
    if (nodeType === "manual" && manualUrl) {
      url = manualUrl;
    } else if (nodeType === "local") {
      url = "http://localhost:1633";
    } else if (nodeType === "dappnode") {
      url = "http://bee.swarm.public.dappnode:1633";
    }

    setBeeApiUrl(url);

    try {
      const wallet = await fetchWalletBalance(url);
      setWallet(wallet);

      const stamps = await fetchPostageBatches(url);
      setBatches(stamps);

      setStatus("✅ Connected!");
    } catch (err) {
      console.error("Connection Error:", err);
      setStatus("❌ Could not connect. Error contacting Bee node.");
    }
  };

  const proceedToUpload = () => {
    if (!wallet || batches.length === 0) {
      setStatus("❌ Please connect first.");
      return;
    }

    navigate("/upload", { state: { beeApiUrl, wallet, batches } });
  };

  const proceedToBuyBatch = () => {
    if (!wallet) {
      setStatus("❌ Please connect first.");
      return;
    }

    navigate("/buy-batch", { state: { beeApiUrl } });
  };

  return (
    <div className="app-container">
      <Header /> {/* ✅ Top-Left Logo */}
    
      {/* ✅ Light/Dark Mode Toggle - Top-Right */}
      <div className="theme-toggle-container">
        <ThemeToggle />
      </div>

      <div className="card">
        <h1>Connect to Bee Node</h1>

        <div className="radio-group">
          <label>
            <input type="radio" value="dappnode" checked={nodeType === "dappnode"} onChange={() => setNodeType("dappnode")} /> Dappnode
          </label>
          <label>
            <input type="radio" value="local" checked={nodeType === "local"} onChange={() => setNodeType("local")} /> Local
          </label>
          <label>
            <input type="radio" value="manual" checked={nodeType === "manual"} onChange={() => setNodeType("manual")} /> Manual
          </label>
        </div>

        {nodeType === "manual" && (
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Enter Bee API URL"
            className="manual-url"
          />
        )}

        <button onClick={handleConnect} className="btn btn-primary">Connect</button>

        {status && <p className="status-msg">{status}</p>}

        {wallet && (
          <div className="wallet-info">
            <p><strong>Wallet BZZ Balance:</strong> {wallet.bzzBalance}</p>
            <p><strong>Ethereum Address:</strong> {wallet.ethereumAddress}</p>
          </div>
        )}

        {batches.length > 0 && (
          <div className="batch-list">
            <h2>Available Batches:</h2>
            <ul>
              {batches.map((batch) => (
                <li key={batch.batchID}>
                  <strong>{batch.label || "(no label)"}</strong><br />
                  ID: {batch.batchID}<br />
                  Type: {batch.type}<br />
                  Depth: {batch.depth} → Capacity: {batch.capacity}<br />
                  TTL: {batch.ttl}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="button-group">
          <button onClick={proceedToUpload} className="btn btn-primary">Proceed to Upload</button>
          <button onClick={proceedToBuyBatch} className="btn btn-secondary">Buy New Batch</button>
        </div>
      </div>
    </div>
  );
}
