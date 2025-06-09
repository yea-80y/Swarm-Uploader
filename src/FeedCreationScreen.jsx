// FeedCreationScreen.jsx — Bee Node Wallet Version
import React, { useState } from "react"
import { keccak256 } from "js-sha3"
import { Bee } from "@ethersphere/bee-js"
import { useNavigate } from "react-router-dom"
import Header from "./Header"
import ThemeToggle from "./ThemeToggle"
import "./styles.css"

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

    const topicHex = "0x" + keccak256(feedName.trim())
    setTopic(topicHex)
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
      const writer = bee.makeFeedWriter(0x00, topic)

      // ✅ This uses Bee node's internal wallet to sign
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
