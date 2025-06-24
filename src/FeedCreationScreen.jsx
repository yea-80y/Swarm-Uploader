// FeedCreationScreen.jsx — Secure Feed Creation + Signing + Batch ID Support
import React, { useState } from "react"
import { Bee } from "@ethersphere/bee-js" // ✅ Core Swarm utilities
import { keccak256 } from "js-sha3"
import { getBytes, isHexString } from "ethers" // ✅ Correct Ethers v6 import
import { useNavigate } from "react-router-dom"
import Header from "./Header"
import ThemeToggle from "./ThemeToggle"
import "./styles.css"

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
      const topicHex = "0x" + keccak256(feedName.trim())
      setTopicObj(topicHex)

      // ✅ Retrieve Bee node wallet address (this is the feed owner)
      const addressRes = await fetch(`${beeApiUrl}/addresses`)
      const { ethereum: wallet } = await addressRes.json()
      setOwner(wallet)

      // ✅ Try to get the feed manifest (if it's already published)
      let reference = ""
      try {
        const manifestRes = await fetch(`${beeApiUrl}/feeds/${wallet}/${topicHex.slice(2)}/manifest`)
        const manifestData = await manifestRes.json()
        reference = manifestData.reference
        setFeedHash(reference)
      } catch {
        reference = "(not yet created)"
        setFeedHash(reference)
      }

      // ✅ Try to fetch the current content of the feed (latest update)
      try {
        const topicStr = topicHex.slice(2)
        const reader = bee.makeFeedReader(0, topicStr, wallet)
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

      // ✅ Derive the same topic again for update
      const topicHex = "0x" + keccak256(feedName.trim())

      if (!isHexString(topicHex, 32)) {
        setStatus("❌ Topic hex string is invalid or not 32 bytes.")
        return
      }

      // ✅ Correct format: pass bytes to makeFeedWriter
      const topicBytes = getBytes(topicHex)

      // ✅ Writer signs and uploads the feed update
      const writer = bee.makeFeedWriter(topicBytes, signer)

      await writer.uploadFeedUpdate(manualHash.trim(), batchId.trim())

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
        topic: topicObj ? topicObj.slice(2) : "",
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
            <p><strong>Feed Hash (Static, Shareable):</strong><br />{feedHash}</p>
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
