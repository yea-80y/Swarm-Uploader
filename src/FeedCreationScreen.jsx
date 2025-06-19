// FeedCreationScreen.jsx — Secure Feed Creation + Signing + Batch ID Support
import React, { useState } from "react"
import { Bee, makeEthereumSigner, Utils } from "@ethersphere/bee-js" // ✅ Utils replaces Topic for topic handling
import { keccak256 } from "js-sha3" // ✅ Used to derive deterministic topic from feed name
import { useNavigate, useLocation } from "react-router-dom"
import Header from "./Header"
import ThemeToggle from "./ThemeToggle"
import "./styles.css"

export default function FeedCreationScreen() {
  // ✅ State variables for feed creation and updates
  const [feedName, setFeedName] = useState("")
  const [topicObj, setTopicObj] = useState(null) // Stores Uint8Array version of topic
  const [owner, setOwner] = useState("") // Ethereum address of Bee node wallet
  const [feedHash, setFeedHash] = useState("") // Static feed reference (shareable)
  const [currentContent, setCurrentContent] = useState("") // Swarm hash currently pointed to
  const [manualHash, setManualHash] = useState("") // New Swarm hash entered by user
  const [batchId, setBatchId] = useState("") // ✅ User must select a usable batch
  const [status, setStatus] = useState("") // For UI feedback
  const [feedCreated, setFeedCreated] = useState(false) // Controls what’s shown in the UI

  const navigate = useNavigate()
  const location = useLocation()
  const beeApiUrl = location.state?.beeApiUrl || "http://bee.swarm.public.dappnode:1633"

  // ✅ Feed creation (does not sign or upload content — it derives the feed identity)
  const createFeed = async () => {
    if (!feedName.trim()) {
      setStatus("❌ Please enter a feed name.")
      return
    }

    try {
      const bee = new Bee(beeApiUrl)

      // ✅ Topic is a keccak256 hash of feed name → converted to Uint8Array using Utils
      const topicHex = "0x" + keccak256(feedName.trim())
      const topic = Utils.hexToBytes(topicHex)
      setTopicObj(topic)

      // ✅ Get Bee node wallet address (used as feed owner)
      const addressRes = await fetch(`${beeApiUrl}/addresses`)
      const { ethereum: wallet } = await addressRes.json()
      setOwner(wallet)

      // ✅ Check for existing feed manifest (if feed has been written to)
      let reference = ""
      try {
        const manifestRes = await fetch(`${beeApiUrl}/feeds/${wallet}/${Utils.bytesToHex(topic)}/manifest`)
        const manifestData = await manifestRes.json()
        reference = manifestData.reference
        setFeedHash(reference)
      } catch {
        // Feed doesn't yet exist on-chain
        reference = "(not yet created)"
        setFeedHash(reference)
      }

      // ✅ Try reading latest feed update (if it exists)
      try {
        const reader = bee.makeFeedReader(0, topic, wallet)
        const { reference: current } = await reader.download()
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

  // ✅ Feed update — securely signs new Swarm hash and uploads SOC using user-provided batch
  const updateFeed = async () => {
    if (!manualHash.trim() || !feedName.trim() || !owner || !batchId.trim()) {
      setStatus("❌ Missing feed name, owner, Swarm hash, or batch ID.")
      return
    }

    try {
      const bee = new Bee(beeApiUrl)
      const topicHex = "0x" + keccak256(feedName.trim())
      const topic = Utils.hexToBytes(topicHex)

      // ❗ Replace with secure signer (local microservice or env in prod)
      const privateKey = "0xYOUR_PRIVATE_KEY"
      const signer = makeEthereumSigner(privateKey)

      // ✅ Writer is responsible for uploading feed chunks signed by this owner
      const writer = bee.makeFeedWriter(0, topic, await signer.address())

      // ✅ Upload signed update to feed using a valid stamp
      await bee.uploadFeedUpdate(writer, signer, manualHash.trim(), batchId.trim())

      setCurrentContent(manualHash.trim())
      setStatus("✅ Feed updated to point to: " + manualHash.trim())
    } catch (err) {
      console.error("❌ Feed update error:", err)
      setStatus("❌ Failed to update feed: " + (err.message || "Unknown error"))
    }
  }

  // ✅ Navigate to next step, passing feed topic and name forward
  const handleProceed = () => {
    navigate("/upload", {
      state: {
        beeApiUrl,
        topic: topicObj ? Utils.bytesToHex(topicObj) : "",
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
