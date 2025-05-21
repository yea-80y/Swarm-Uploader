import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "./Header"; // ✅ Import Header
import "./styles.css";
import ThemeToggle from "./ThemeToggle"; // ✅ Import Toggle

export default function BuyBatchScreen() {
  const { state } = useLocation();
  const beeApiUrl = state?.beeApiUrl || "http://bee.swarm.public.dappnode:1633";
  const [file, setFile] = useState(null);
  const [batchDepth, setBatchDepth] = useState(17);
  const [cost, setCost] = useState(0);
  const [wallet, setWallet] = useState(null);
  const [status, setStatus] = useState(null);
  const [isImmutable, setIsImmutable] = useState(true);
  const [batchName, setBatchName] = useState("");
  const [ttl, setTtl] = useState(31536000); // Default TTL (1 Year)
  const [batchId, setBatchId] = useState(null);
  const [waitingForBatch, setWaitingForBatch] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [plurPerChunk, setPlurPerChunk] = useState(null);
  const [batchUsable, setBatchUsable] = useState(false);
  const [beeSoundPlayed, setBeeSoundPlayed] = useState(false);
  const [uploadMode, setUploadMode] = useState("file"); // ✅ File by default
  const navigate = useNavigate();
  const beeSound = new Audio("/Bee.mp3");
  const BLOCKS_PER_DAY = 17280;

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
    35: 128000000,
  };

  useEffect(() => {
    fetchWalletBalance();
  }, [beeApiUrl]);

  const fetchWalletBalance = async () => {
    try {
      const response = await fetch(`${beeApiUrl}/wallet`);
      const data = await response.json();
      const rawBalance = BigInt(data.bzzBalance);
      const xBZZBalance = Number(rawBalance) / 1e16;
      setWallet(xBZZBalance.toFixed(4)); // Display as xBZZ

      const priceResponse = await fetch(`${beeApiUrl}/chainstate`);
      const priceData = await priceResponse.json();
      setCurrentPrice(parseInt(priceData.currentPrice));
      recalculateCost(batchDepth, ttl);
    } catch (err) {
      setStatus("❌ Failed to fetch wallet balance or price.");
    }
  };

 // ✅ Updated File Selection Logic (Supports File and Folder)
  const handleFileChange = (e) => {
    const files = e.target.files;
    let totalSizeMB = 0;

    if (uploadMode === "folder") {
      // ✅ For folder, calculate total size of all files
      totalSizeMB = Array.from(files).reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
      setFile(files); // Save all files for folder
      console.log("✅ Folder Selected:", files);
    } else {
      // ✅ For single file, calculate size of the selected file
      totalSizeMB = files[0]?.size / (1024 * 1024);
      setFile(files[0]);
      console.log("✅ File Selected:", files[0]?.name);
    }

    console.log("✅ Total Upload Size:", totalSizeMB, "MB");
    
    // ✅ Calculate batch depth based on total size (folder or single file)
    const depth = calculateBatchDepth(totalSizeMB);
    setBatchDepth(depth);
    recalculateCost(depth, ttl);
  };

  // ✅ Calculate Batch Depth Based on Size (Unchanged)
  const calculateBatchDepth = (fileSizeMB) => {
    for (const [depth, capacityMB] of Object.entries(EFFECTIVE_VOLUME_MEDIUM_MB)) {
      if (fileSizeMB <= capacityMB) {
        return parseInt(depth);
      }
    }
    return 35; // Default maximum depth if file size exceeds all options
  };

  const recalculateCost = (depth, storageDurationSeconds) => {
    if (!currentPrice) return;
    const totalChunks = BigInt(Math.pow(2, depth));
    const scaledPlurPerChunk = (BigInt(currentPrice) * BigInt(BLOCKS_PER_DAY) * BigInt(storageDurationSeconds)) / BigInt(86400);
    setPlurPerChunk(scaledPlurPerChunk);
    const totalPlur = scaledPlurPerChunk * totalChunks;
    setCost((Number(totalPlur) / 1e16).toFixed(8)); // Display as xBZZ
  };

  const handleTTLChange = (e) => {
    const selectedTTL = parseInt(e.target.value);
    setTtl(selectedTTL);
    recalculateCost(batchDepth, selectedTTL);
  };

  // ✅ Updated Handle Buy Batch Function
  const handleBuyBatch = async () => {
    if (!file) {
      setStatus("❌ Please select a file first.");
      return;
    }
  
    if (!batchName.trim()) {
      setStatus("❌ Please enter a batch name.");
      return;
    }
  
    const confirmed = window.confirm(
      `Confirm purchase of batch with depth ${batchDepth} for approximately ${cost} xBZZ?`
    );
    if (!confirmed) return;
  
    setStatus("⏳ Purchasing batch...");
  
    try {
      console.log("✅ Immutable State Before API Call:", isImmutable); // Debugging log
      console.log("✅ Batch Name:", batchName); // Debugging log
  
      const apiUrl = `${beeApiUrl}/stamps/${plurPerChunk.toString()}/${batchDepth}?label=${encodeURIComponent(batchName)}`;
      console.log("✅ API URL:", apiUrl); // Debugging log
      console.log(`📡 API Call → Depth Used: ${batchDepth}`);

  
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "immutable": isImmutable ? "true" : "false", // ✅ Setting Immutable Header
        },
      });
  
      const data = await response.json();
      const batchID = data.batchID;
  
      if (!batchID) {
        setStatus("❌ Error: Invalid Batch ID received.");
        return;
      }
  
      console.log("✅ Purchased Batch ID:", batchID);
      setBatchId(batchID);
      setStatus(`✅ Batch ${batchID} purchased. Checking if it is usable...`);
  
      setTimeout(() => checkBatchUsable(batchID, isImmutable), 3000);
    } catch (err) {
      console.error("❌ Failed to purchase batch:", err);
      setStatus("❌ Failed to purchase batch: " + err.message);
    }
  };  

// ✅ Updated Batch Check Function
const checkBatchUsable = async (batchID, initialImmutable) => {
  let attempts = 0;
  const maxAttempts = 50;

  const interval = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(interval);
      setStatus("❌ Batch did not become usable in expected time.");
      return;
    }

    try {
      const response = await fetch(`${beeApiUrl}/stamps/${batchID}`);
      const data = await response.json();
      console.log("✅ Batch Details on Check:", data); // Debugging log

      if (data.usable) {
        clearInterval(interval);
        setBatchUsable(true);

        // ✅ Directly Compare with the User's Selection Since API Doesn't Return Immutable
        const actualImmutable = initialImmutable ? "Immutable" : "Mutable";
        const expectedImmutable = initialImmutable ? "Immutable" : "Mutable";
        console.log("✅ Expected Immutable:", expectedImmutable);
        console.log("✅ Actual Immutable (User Selected):", actualImmutable);

        setStatus(`✅ Batch ${batchID} is now usable as ${actualImmutable}.`);
        
        if (!beeSoundPlayed) {
          beeSound.play();
          setBeeSoundPlayed(true);
        }
      }
    } catch (err) {
      console.error("❌ Error checking batch status:", err);
    }
  }, 3000);
};

  const proceedToUpload = () => {
  navigate("/upload", {
    state: {
      beeApiUrl, // Only passing the Bee API URL, no file or batch data
    },
  });
};

  return (
    <div className="app-container">
      <Header /> {/* ✅ Top-Left Logo */}
      {/* ✅ Light/Dark Mode Toggle - Top-Right */}
          <div className="theme-toggle-container">
            <ThemeToggle />
          </div>
          <div className="card">
          <h1>Buy Swarm Batch</h1>
          
          {/* ✅ Upload Mode Selector */}
          <label>Upload Mode:</label>
          <select value={uploadMode} onChange={(e) => setUploadMode(e.target.value)}>
            <option value="file">File</option>
            <option value="folder">Folder (Website)</option>
          </select>

          {/* ✅ File or Folder Input */}
          <input 
            type="file" 
            {...(uploadMode === "folder" ? { webkitdirectory: "true", directory: "true" } : {})} 
            multiple={uploadMode === "folder"} 
            onChange={handleFileChange} 
          />
          
        <input type="text" placeholder="Batch Name" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
        <label>Immutable:</label>
        <input type="checkbox" checked={isImmutable} onChange={(e) => setIsImmutable(e.target.checked)} />
        <p><strong>Calculated Batch Depth:</strong> {batchDepth}</p>
        <p><strong>PLUR/Chunk:</strong> {plurPerChunk ? plurPerChunk.toString() : "Calculating..."}</p>
        <p><strong>Estimated Cost:</strong> {cost} xBZZ</p>
        <p><strong>Your Wallet Balance:</strong> {wallet ? `${wallet} xBZZ` : "Loading..."}</p>
        <label>Choose TTL (Storage Duration):</label>
        <select value={ttl} onChange={handleTTLChange}>
          <option value={93600}>26 Hours</option>
          <option value={604800}>1 Week</option>
          <option value={2592000}>1 Month</option>
          <option value={31536000}>1 Year</option>
        </select>
        <button onClick={handleBuyBatch} className="btn btn-primary">Buy Batch</button>

          {batchUsable ? (
            <>
              <p>✅ Batch {batchId} is now usable.</p>
              <button onClick={proceedToUpload} className="btn btn-success">Proceed to Upload</button>
            </>
          ) : (
            status && <p>{status}</p>
          )}
      </div>
    </div>
  );
}
