// FeedCreationScreen.jsx — Secure Feed Creation + Signing + Batch ID Support
import React, { useState } from "react"
import { Bee, Topic } from "@ethersphere/bee-js" // ✅ Core Swarm utilities
import { keccak256 } from "js-sha3"
import { getBytes, isHexString, Wallet } from "ethers" // ✅ Correct Ethers v6 import
import { useNavigate } from "react-router-dom"
import Header from "./Header"
import ThemeToggle from "./ThemeToggle"
import "./styles.css"

// ✅ Helper to drop '0x' from feed hash
function removeHexPrefix(hash) {
  return hash.startsWith('0x') ? hash.slice(2) : hash
}

export default function FeedCreationScreen({ signer, beeApiUrl, onReset }) {
  // ✅ State variables for managing feed setup and update flow
  const [feedName, setFeedName] = useState("")
  const [topicObj, setTopicObj] = useState(null)
  const [owner, setOwner] = useState("") // Ethereum address from Bee node
  const [feedHash, setFeedHash] = useState("") // Feed reference (may not exist yet)
  const [currentContent, setCurrentContent] = useState("") // Current content pointer
  const [manualHash, setManualHash] = useState("") // User-entered Swarm hash
  const [batchId, setBatchId] = useState("") // ✅ Manually entered batch ID
  const [status, setStatus] = useState("")
  const [feedCreated, setFeedCreated] = useState(false)
  const [staticFeedHash, setStaticFeedHash] = useState("") // ✅ NEW: Static Feed Hash

  const navigate = useNavigate()

  // ✅ Called when user clicks "Generate Feed"
  const createFeed = async () => {
    if (!feedName.trim()) {
      setStatus("❌ Please enter a feed name.")
      return
    }

    try {
      const bee = new Bee(beeApiUrl)

      // ✅ Topic = hash of feed name → used as a unique feed identifier
      const topicInstance = Topic.fromString(feedName.trim())
      setTopicObj(topicInstance)

      // ✅ Updated - Retrieve v3 address (this is the feed owner)
      const signerWallet = new Wallet(signer)
      const signerAddress = await signerWallet.getAddress()

      setOwner(signerAddress) // ✅ Store the V3 signer address in state

      // Set Static Feed Hash for Display 
      const ownerBytes = getBytes(signerAddress)
      const topicBytes = topicInstance

      const combined = new Uint8Array(ownerBytes.length + topicBytes.length)
      combined.set(ownerBytes)
      combined.set(topicBytes, ownerBytes.length)

      const staticFeedHash = "0x" + keccak256(combined)

      setStaticFeedHash(staticFeedHash)

      // ✅ Try to get the feed manifest (if it's already published)
      let reference = ""
      try {
        const manifestRes = await fetch(`${beeApiUrl}/feeds/${signerAddress}/${removeHexPrefix(topicInstance.toHexString())}/manifest`)
        const manifestData = await manifestRes.json()
        reference = manifestData.reference
        setFeedHash(reference)
      } catch {
        reference = "(not yet created)"
        setFeedHash(reference)
      }

      // ✅ Try to fetch the current content of the feed (latest update)
      try {
        const reader = bee.makeFeedReader(topicObj, signerAddress)
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
      const writer = bee.makeFeedWriter(topic, signer)

      console.log("🔄 Preparing feed update with parameters:")
      console.log("📦 Batch ID:", batchId.trim())
      console.log("📂 Swarm Hash (Reference):", manualHash.trim())
      console.log("📝 Topic:", feedName.trim())
      console.log("🧾 V3 Signer (Private Key):", signer)

      await writer.upload(batchId.trim(), manualHash.trim())

      console.log("✅ Feed update successfully sent to Bee node")

      setCurrentContent(manualHash.trim())
      setStatus("✅ Feed updated to point to: " + manualHash.trim())
    } catch (err) {
      console.error("❌ Feed update error:", err)
      setStatus("❌ Failed to update feed: " + (err.message || "Unknown error"))
    }
  }

  // ✅ Used to continue to upload page
  const handleProceed = () => {
    navigate("/upload", {
      state: {
        beeApiUrl,
        staticFeedHash: removeHexPrefix(staticFeedHash),
        feedName
      }
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

        <button onClick={createFeed} className="btn btn-primary">
          Generate Feed
        </button>

        {feedCreated && (
          <>
            <p><strong>Feed Hash (Static, Shareable):</strong><br />{removeHexPrefix(staticFeedHash)}</p>
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
