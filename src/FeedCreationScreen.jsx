// FeedCreationScreen.jsx — Bee Node Wallet Version
import React, { useState } from "react"
import { keccak256 } from "js-sha3"
import { Bee, Topic } from "@ethersphere/bee-js"
import { useNavigate } from "react-router-dom"
import Header from "./Header"
import ThemeToggle from "./ThemeToggle"
import "./styles.css"

function hexToBytes(hex) {
  hex = hex.replace(/^0x/, '')
  if (hex.length !== 64) throw new Error('Topic hex must be 32 bytes (64 hex chars)')
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 64; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

export default function FeedCreationScreen() {
  const [feedName, setFeedName] = useState("")
  const [topic, setTopic] = useState("")
  const [manualHash, setManualHash] = useState("")
  const [status, setStatus] = useState("")
  const [feedCreated, setFeedCreated] = useState(false)
  const beeApiUrl = "http://bee.swarm.public.dappnode:1633"
  const navigate = useNavigate()

  const createFeed = async () => {
    if (!feedName.trim()) {
        setStatus("❌ Please enter a feed name.")
        return
    }

    // keccak256 returns a 64-char hex string (32 bytes)
    let topicHex = keccak256(feedName.trim())
    // Ensure it is 64 chars (32 bytes)
    if (topicHex.length !== 64) {
        setStatus("❌ Topic hash is not 32 bytes!")
        return
    }
    topicHex = "0x" + topicHex
    setTopic(topicHex.trim())
    console.log("✅ Feed Topic:", topicHex)
    setFeedCreated(true)
    setStatus("✅ Feed topic created. You can now update the feed.")
    }

  const updateFeed = async () => {
    if (!manualHash || !topic) {
        setStatus("❌ Missing topic or hash.")
        return
    }

    try {
        const bee = new Bee(beeApiUrl)

        // Debug: print topic
        console.log("Topic string:", topic)

        // Convert topic hex string to Bytes<32>
        const topicBytes = hexToBytes(topic)

        // Debug: print topicBytes
        console.log("Topic bytes length:", topicBytes.length, topicBytes)

        console.log("Topic class:", Topic)

        // Make feed writer
        const writer = bee.makeFeedWriter(0x00, new Topic(topicBytes))


        await bee.uploadFeedUpdate(writer, undefined, manualHash.trim())

        setStatus("✅ Feed updated with provided Swarm hash.")
    } catch (err) {
        console.error("❌ Feed update error:", err)
        setStatus("❌ Failed to update feed: " + (err.message || "Unknown error"))
    }
    }

  const handleProceed = () => {
    navigate("/upload", {
      state: {
        beeApiUrl,
        topic,
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
        <h1>Create Swarm Feed</h1>

        <input
          type="text"
          placeholder="Enter Feed Name (e.g. MyWebsite)"
          value={feedName}
          onChange={(e) => setFeedName(e.target.value)}
        />

        <button onClick={createFeed} className="btn btn-primary">Generate Feed</button>

        {feedCreated && (
          <>
            <p><strong>Feed Topic:</strong> {topic}</p>

            <input
              type="text"
              placeholder="Optional: Paste Swarm hash to update feed"
              value={manualHash}
              onChange={(e) => setManualHash(e.target.value)}
            />
            <button onClick={updateFeed} className="btn btn-secondary">Update Feed with Hash</button>
            <button onClick={handleProceed} className="btn btn-primary">Proceed</button>
          </>
        )}

        {status && <p className="status-msg">{status}</p>}
      </div>
    </div>
  )
}
