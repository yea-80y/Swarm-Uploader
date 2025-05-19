// ENSUpdateScreen.jsx - Auto-Detect ENS Name + Direct ENS Link
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "./Header"; // ✅ Import Header
import "./styles.css";
import ThemeToggle from "./ThemeToggle"; // ✅ Import Toggle

export default function ENSUpdateScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const swarmHash = state?.swarmHash;

  const [ensName, setEnsName] = useState("");
  const [status, setStatus] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [provider, setProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [ensUrl, setEnsUrl] = useState(""); // ✅ Added State for ENS URL

  // ✅ MetaMask Detection and Provider Setup
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      console.log("✅ MetaMask Detected.");
    } else {
      console.error("❌ MetaMask not detected. Please install MetaMask.");
      setStatus("❌ MetaMask not detected. Please install MetaMask.");
    }
  }, []);

  // ✅ Secure Connect Wallet Function
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        setStatus("❌ MetaMask not detected. Please install MetaMask.");
        return;
      }

      setIsConnecting(true);
      const ethereumProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethereumProvider.getSigner();
      const address = await signer.getAddress();
      setProvider(ethereumProvider);
      setWalletAddress(address);
      setStatus(`✅ Wallet connected: ${address}`);
      console.log("✅ Wallet connected:", address);

      // ✅ Auto-Detect ENS Name for the Connected Wallet
      const detectedEnsName = await ethereumProvider.lookupAddress(address);
      if (detectedEnsName) {
        setEnsName(detectedEnsName);
        console.log("✅ ENS Name Detected:", detectedEnsName);
      } else {
        setEnsName(""); // Clear if no ENS found
        console.log("❌ No ENS name detected for this wallet.");
      }
    } catch (err) {
      console.error("❌ Wallet Connection Error:", err);
      setStatus("❌ Failed to connect wallet: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // ✅ Function to Update ENS Content Hash
  const updateENS = async () => {
    if (!ensName || !swarmHash) {
      setStatus("❌ Please enter an ENS name and ensure Swarm Hash is present.");
      return;
    }

    if (!provider) {
      setStatus("❌ Wallet not connected. Please connect first.");
      return;
    }

    try {
      setStatus("⏳ Updating ENS record...");

      const signer = await provider.getSigner();
      const ensRegistryAddress = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"; // Mainnet ENS Registry
      const ensContract = new ethers.Contract(
        ensRegistryAddress,
        ["function setContenthash(bytes32 node, bytes calldata hash) external"],
        signer
      );

      const node = ethers.namehash(ensName);
      const contentHash = "0xe30101720020" + swarmHash; // Swarm hash formatted

      console.log("✅ ENS Node:", node);
      console.log("✅ Content Hash:", contentHash);

      const tx = await ensContract.setContenthash(node, contentHash);
      setStatus("⏳ Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setStatus("✅ ENS updated successfully!");

      // ✅ Generate and set ENS URL after successful update
      setEnsUrl(`https://${ensName}.eth.limo`);
    } catch (err) {
      console.error("❌ Error Updating ENS:", err);
      setStatus("❌ Failed to update ENS: " + err.message);
      setEnsUrl(""); // Clear URL on error
    }
  };

  return (
    <div className="app-container">
    <Header /> {/* ✅ Top-Left Logo */}
    {/* ✅ Light/Dark Mode Toggle - Top-Right */}
          <div className="theme-toggle-container">
            <ThemeToggle />
          </div>
      <div className="card">
        <h1>Update ENS Content Hash</h1>
        <p>Wallet: {walletAddress || "Not connected"}</p>
        <p>ENS Name: {ensName || "Not detected"}</p>

        {/* ✅ Connect Wallet Button */}
        <button onClick={connectWallet} className="btn btn-primary" disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>

        {/* ✅ ENS Name Input (if Auto-Detected) */}
        <input
          type="text"
          placeholder="Enter ENS name"
          value={ensName}
          onChange={(e) => setEnsName(e.target.value)}
        />

        {/* ✅ Display Swarm Hash */}
        <p>Swarm Hash: {swarmHash || "Not provided"}</p>

        {/* ✅ Update ENS Button */}
        <button onClick={updateENS} className="btn btn-primary" disabled={!walletAddress}>
          Update ENS
        </button>
        
        {status && <p>{status}</p>}

        {/* ✅ Display ENS Link After Successful Update */}
        {status.includes("✅ ENS updated successfully!") && ensUrl && (
          <div>
            <p>✅ ENS Updated Successfully!</p>
            <a 
              href={ensUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-link"
            >
              View on {ensName}.eth.limo
            </a>
          </div>
        )}

        {/* ✅ Back to Upload Screen Button */}
        <button onClick={() => navigate("/upload")} className="btn btn-secondary">
          Back to Upload
        </button>
      </div>
    </div>
  );
}
