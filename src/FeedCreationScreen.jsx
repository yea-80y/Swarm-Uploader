// FeedCreationScreen.jsx — Final Version with Dynamic Bee URL + Topic Fix
import React, { useState } from "react"
import { Bee, Topic } from "@ethersphere/bee-js"
import { keccak256 } from "js-sha3"
import { useNavigate, useLocation } from "react-router-dom"
import Header from "./Header"
import ThemeToggle from "./ThemeToggle"
import "./styles.css"

export default function FeedCreationScreen() {
  const [feedName, setFeedName] = useState("")
  const [topicObj, setTopicObj] = useState(null)
  const [owner, setOwner] = useState("")
  const [feedHash, setFeedHash] = useState("")
  const [currentContent, setCurrentContent] = useState("")
  const [manualHash, setManualHash] = useState("")
  const [status, setStatus] = useState("")
  const [feedCreated, setFeedCreated] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const beeApiUrl = location.state?.beeApiUrl || "http://bee.swarm.public.dappnode:1633"

  const createFeed = async () => {
    if (!feedName.trim()) {
      setStatus("❌ Please enter a feed name.")
      return
    }

    try {
      const bee = new Bee(beeApiUrl)
      const topicHex = "0x" + keccak256(feedName.trim())
      const topic = new Topic(topicHex)
      setTopicObj(topic)

      const addressRes = await fetch(`${beeApiUrl}/addresses`)
      const { ethereum: wallet } = await addressRes.json()
      setOwner(wallet)

      // Gracefully handle empty feeds
      let reference = ""
      try {
        const manifestRes = await fetch(`${beeApiUrl}/feeds/${wallet}/${topic.toHex()}/manifest`)
        const manifestData = await manifestRes.json()
        reference = manifestData.reference
        setFeedHash(reference)
      } catch {
        reference = "(not yet created)"
        setFeedHash(reference)
      }

      try {
        const reader = bee.makeFeedReader(0, topic, owner)
        const { reference: current } = await reader.download()
        setCurrentContent(current)
      } catch {
        setCurrentContent("")
      }

      setFeedCreated(true)
      setStatus(`✅ Feed initialized.`)
    } catch (err) {
      console.error("❌ Feed creation failed:", err)
      setStatus("❌ Failed to create feed: " + (err.message || "Unknown error"))
    }
  }

  const updateFeed = async () => {
    if (!manualHash.trim() || !feedName.trim() || !owner) {
      setStatus("❌ Missing feed name, owner, or Swarm hash.")
      return
    }

    try {
      const bee = new Bee(beeApiUrl)

      const topicHex = "0x" + keccak256(feedName.trim())
      const topic = new Topic(topicHex) // ✅ always recreate topic here

      const writer = bee.makeFeedWriter(0, topic, owner)
      await bee.uploadFeedUpdate(writer, undefined, manualHash.trim())

      setCurrentContent(manualHash.trim())
      setStatus("✅ Feed updated to point to: " + manualHash.trim())
    } catch (err) {
      console.error("❌ Feed update error:", err)
      setStatus("❌ Failed to update feed: " + (err.message || "Unknown error"))
    }
  }


  const handleProceed = () => {
    navigate("/upload", {
      state: {
        beeApiUrl,
        topic: topicObj?.toHex() ?? "",
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
            <button
              onClick={updateFeed}
              className="btn btn-secondary"
              disabled={!manualHash.trim()}
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
