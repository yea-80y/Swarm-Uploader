// FeedCreationScreen.jsx — Secure Feed Creation + Signing + Batch ID Support
import React, { useState } from "react"
import { Bee, Topic } from "@ethersphere/bee-js" // ✅ Core Swarm utilities
import { Wallet } from "ethers" // ✅ Correct Ethers v6 import
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import ThemeToggle from "../components/ThemeToggle"
import "../styles.css"

// ✅ Helper to drop '0x' from feed hash
function removeHexPrefix(hash) {
  return hash.startsWith('0x') ? hash.slice(2) : hash
}

export default function FeedCreationScreen({ signer, beeApiUrl, onReset, swarmHash }) {
  // ✅ State variables for managing feed setup and update flow
  const [feedName, setFeedName] = useState("")
  const [owner, setOwner] = useState("") // Ethereum address from Bee node
  const [feedHash, setFeedHash] = useState("") // Feed reference (may not exist yet)
  const [currentContent, setCurrentContent] = useState("") // Current content pointer
  const [manualHash, setManualHash] = useState(swarmHash || "") // User-entered Swarm hash
  const [batchId, setBatchId] = useState("") // ✅ Manually entered batch ID
  const [status, setStatus] = useState("")
  const [feedCreated, setFeedCreated] = useState(false)

  const navigate = useNavigate()

  // ✅ Called when user clicks "Generate Feed"
  const createFeed = async () => {
    if (!feedName.trim()) {
      setStatus("❌ Please enter a feed name.")
      return
    }

    if (!batchId.trim()) {
      setStatus("❌ Please enter a Postage Batch ID.")
      return
    }

    try {
      const bee = new Bee(beeApiUrl)

      // ✅ Topic = hash of feed name → used as a unique feed identifier

      // ✅ Updated - Retrieve v3 address (this is the feed owner)
      const signerWallet = new Wallet(signer)
      const signerAddress = await signerWallet.getAddress()

      setOwner(signerAddress) // ✅ Store the V3 signer address in state

      const topic = Topic.fromString(feedName.trim())

      const rawBatch = batchId.trim()
      const batchIdHex = rawBatch.startsWith('0x') ? rawBatch : '0x' + rawBatch

      const manifestResponse = await bee.createFeedManifest(batchIdHex, topic, signerAddress)

      console.log("📦 manifestResponse:", manifestResponse)
      console.log("📦 reference:", manifestResponse.reference)

      // This is the Swarm hash 
      setFeedHash(manifestResponse.toHex())

      // Set Static Feed Hash for Display 
      

      // ✅ Try to fetch the current content of the feed (latest update)
      try {
        const reader = bee.makeFeedReader(topic, signerAddress)
        const current = await reader.downloadData()
        setCurrentContent(current)
      } catch {
        setCurrentContent("") // No update yet
      }

      setFeedCreated(true)
      setStatus("✅ Feed initialized.")
    } catch (err) {
      console.error("❌ Feed creation failed:", err)
      setStatus("❌ Failed to create feed: " + (err.message || "Unknown error"))
    }
  }

  // ✅ Called when user clicks "Update Feed with Hash"
  const updateFeed = async () => {
    if (!manualHash.trim() || !feedName.trim() || !owner || !batchId.trim()) {
      setStatus("❌ Missing feed name, owner, Swarm hash, or batch ID.")
      return
    }

    try {
      const bee = new Bee(beeApiUrl)

      // ✅ Correct format: pass bytes to makeFeedWriter
      

      // ✅ Writer signs and uploads the feed update
      const topic = Topic.fromString(feedName.trim())
      const rawBatch = batchId.trim()
      const batchIdHex = rawBatch.startsWith('0x') ? rawBatch : '0x' + rawBatch

      const writer = bee.makeFeedWriter(topic, signer)

      console.log("🔄 Preparing feed update with parameters:")
      console.log("📦 Batch ID:", batchId.trim())
      console.log("📂 Swarm Hash (Reference):", manualHash.trim())
      console.log("📝 Topic:", feedName.trim())
      console.log("🧾 V3 Signer (Private Key):", signer)

      await writer.upload(batchIdHex, manualHash.trim())

      console.log("✅ Feed update successfully sent to Bee node")

      setCurrentContent(manualHash.trim())
      setStatus("✅ Feed updated to point to: " + manualHash.trim())
    } catch (err) {
      console.error("❌ Feed update error:", err)
      setStatus("❌ Failed to update feed: " + (err.message || "Unknown error"))
    }
  }

  // ✅ Used to continue to ENS page
  const handleProceed = () => {
    navigate("/ens-update", {
      state: { swarmHash: feedHash }
    })
  }

  return (
    <div className="app-container">
      <Header />
      <div className="theme-toggle-container">
        <ThemeToggle />
      </div>

      <div className="card">
        <button onClick={onReset} className="btn btn-secondary" style={{ marginBottom: "20px" }}>
          Return to V3 Setup
        </button>

        <h1>Create Swarm Feed</h1>

        <input
          type="text"
          placeholder="Enter Feed Name (e.g. MyWebsite)"
          value={feedName}
          onChange={(e) => setFeedName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Enter Postage Batch ID"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          style={{ marginTop: "10px" }}
        />

        <button onClick={createFeed} className="btn btn-primary">
          Generate Feed
        </button>

        {feedCreated && (
          <>
            <p><strong>Feed Hash (Shareable):</strong><br />{feedHash}</p>
            <p><strong>Feed Status:</strong><br />{feedHash}</p>
            {currentContent && (
              <p><strong>Currently Points To:</strong><br />{currentContent}</p>
            )}

            <input
              type="text"
              placeholder="Paste new Swarm hash to update feed"
              value={manualHash}
              onChange={(e) => setManualHash(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter Postage Batch ID"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            />
            <button
              onClick={updateFeed}
              className="btn btn-secondary"
              disabled={!manualHash.trim() || !batchId.trim()}
            >
              Update Feed with Hash
            </button>
          </>
        )}

        {feedCreated && (
          <button onClick={handleProceed} className="btn btn-primary">
            Proceed
          </button>
        )}

        {status && <p className="status-msg">{status}</p>}
      </div>
    </div>
  )
}
