// ENSUpdateScreen.jsx - Auto-Detect ENS Name + Direct ENS Link
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { encode } from "@ensdomains/content-hash";
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

  // ✅ Function to Update ENS Content Hash (using the Public Resolver)
const updateENS = async () => {
  if (!ensName || !swarmHash) {
    setStatus("❌ Please enter an ENS name and ensure Swarm Hash is present.");
    return;
  }
  if (!provider) {
    setStatus("❌ Wallet not connected. Please connect first.");
    return;
  }
  if (!/^([a-z0-9-]+\.)*[a-z0-9-]+\.eth$/.test(ensName)) {
    setStatus("❌ Invalid ENS name. Ensure it ends with .eth");
    return;
  }
  if (!/^([a-fA-F0-9]{64})$/.test(swarmHash)) {
    setStatus("❌ Invalid Swarm hash. Ensure it is a 64-character hex string.");
    return;
  }

  try {
    setStatus("⏳ Updating ENS record...");

    // 1) Get signer from provider
    const signer = await provider.getSigner();

    // 2) Read‐only ENS registry to find or set your resolver
    const registry = new ethers.Contract(
      "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
      [
        "function resolver(bytes32 node) view returns (address)",
        "function setResolver(bytes32 node, address resolver) external"
      ],
      provider
    );


    // 3) Compute ENS namehash
    const node = ethers.namehash(ensName.trim().toLowerCase());

    // 4) Lookup resolver
    let resolverAddress = await registry.resolver(node);  // ← change to `let`

    // 5a) If no resolver is set…
    if (resolverAddress === ethers.ZeroAddress) {
      const PUBLIC_RESOLVER = "0x226159d592E2b063810a10Ebf6dcbFDA94Ed68b8";
      // ensure you call setResolver on a signer‐connected registry:
      const registryWithSigner = registry.connect(signer);
      await registryWithSigner.setResolver(node, PUBLIC_RESOLVER);
      resolverAddress = PUBLIC_RESOLVER;         // now works
    }

    // 5b) Instantiate the *Public Resolver* (writable) with the signer
    const resolver = new ethers.Contract(
      resolverAddress,
      ["function setContenthash(bytes32 node, bytes calldata hash) external"],
      signer
    );

    // 6) Build the content-hash using the ENS content-hash lib for the Swarm codec:
    //    encode() will give you the correct multicodec prefix + your 32-byte digest:
    const normalized = swarmHash.replace(/^0x/, "").toLowerCase();
    const encoded   = encode("swarm", normalized);

    // **DEBUG**: raw multicodec bytes (should start `e40170…`)
    console.log("📦 Raw multicodec (no 0x):", encoded);

    // encode(...) returns a hex string *without* "0x", so just prefix once:
    const contentHash = "0x" + encoded;

    // **DEBUG**: final contentHash and length (should be 0x + 66 hex chars)
    console.log("🧩 Final contentHash:", contentHash, "length:", contentHash.length);


    console.log("✅ ENS Node:", node);
    console.log("✅ Resolver Address:", resolverAddress);
    console.log("✅ Content Hash:", contentHash);
    console.log("✅ Encoded Content Hash:", contentHash);

    // 7) Send it to the resolver, not the registry
    const tx = await resolver.setContenthash(node, contentHash);
    setStatus("⏳ Transaction sent. Waiting for confirmation...");
    await tx.wait();
    setStatus("✅ ENS updated successfully!");

    // 8) Generate view link
    setEnsUrl(`https://${ensName.trim().toLowerCase()}.limo`);
  } catch (err) {
    console.error("❌ Error Updating ENS:", err);
    // Display either revert reason or generic message
    const message = err.reason || err.message || "Transaction reverted";
    setStatus("❌ Failed to update ENS: " + message);
    setEnsUrl("");
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
              View on {ensName}.limo
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
