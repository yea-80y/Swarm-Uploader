// V3SignerSetup.jsx
import React, { useState } from "react"
import { Wallet } from "ethers"

import { useSigner } from '../context/SignerContext.jsx'

export default function V3SignerSetup({ onSignerReady }) {
  const [existingPassword, setExistingPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [keystoreFile, setKeystoreFile] = useState(null)
  const [status, setStatus] = useState("")
  const [generatedKeystore, setGeneratedKeystore] = useState(null)
  const [downloadConfirmed, setDownloadConfirmed] = useState(false)
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState(null)
  const { setSignerPrivateKey } = useSigner()

  const handleKeystoreUpload = async () => {
    if (!keystoreFile || !existingPassword) {
      setStatus("❌ Please upload a keystore and enter its password.")
      return
    }
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const json = JSON.parse(reader.result)
        const wallet = await Wallet.fromEncryptedJson(JSON.stringify(json), existingPassword)
        setSignerPrivateKey(wallet.privateKey)
        onSignerReady(wallet.privateKey)
        setStatus("✅ Signer loaded from keystore.")
      }
      reader.readAsText(keystoreFile)
    } catch (error) {
      console.error(error)
      setStatus("❌ Failed to load signer. Check file and password.")
    }
  }

  const handleCreateNew = async () => {
    if (!newPassword || !confirmPassword) {
      setStatus("❌ Please fill both password fields.")
      return
    }
    if (newPassword !== confirmPassword) {
      setStatus("❌ Passwords do not match.")
      setNewPassword("")
      setConfirmPassword("")
      return
    }
    try {
      const wallet = Wallet.createRandom()
      const json = await wallet.encrypt(newPassword)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      setGeneratedKeystore(url)
      setGeneratedPrivateKey(wallet.privateKey)
      setStatus("✅ New signer created. Please download your keystore.")
    } catch (error) {
      console.error(error)
      setStatus("❌ Failed to create signer.")
    }
  }

  return (
    <div className="v3-signer-setup" style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ marginBottom: "20px" }}>🔐 Setup Feed Signer</h2>

      {/* Existing Keystore Section */}
      <div style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h3 style={{ marginBottom: "10px" }}>Load Existing Keystore</h3>

        <label>Password for Existing Keystore:</label>
        <input
          type="password"
          value={existingPassword}
          onChange={(e) => setExistingPassword(e.target.value)}
          placeholder="Enter password for existing keystore"
          style={{ display: "block", marginBottom: "10px", width: "100%", padding: "8px" }}
        />

        <label>Upload Existing Keystore (.json):</label>
        <input
          type="file"
          accept="application/json"
          onChange={(e) => setKeystoreFile(e.target.files[0])}
          style={{ display: "block", marginBottom: "10px" }}
        />

        <button onClick={handleKeystoreUpload} style={{ padding: "10px 20px" }}>
          Load Signer from Keystore
        </button>
      </div>

      {/* New Keystore Section */}
      <div style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h3 style={{ marginBottom: "10px" }}>Create New Keystore</h3>

        <label>New Password:</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter a password for new keystore"
          style={{ display: "block", marginBottom: "10px", width: "100%", padding: "8px" }}
        />

        <label>Confirm New Password:</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter password to confirm"
          style={{ display: "block", marginBottom: "10px", width: "100%", padding: "8px" }}
        />

        <button onClick={handleCreateNew} style={{ padding: "10px 20px" }}>
          🔐 Create New Keystore
        </button>

        {generatedKeystore && (
          <div style={{ marginTop: "15px" }}>
            <p>✅ Keystore ready. Please save this file securely:</p>
            <a href={generatedKeystore} download="swarm-signer.json" style={{ color: "blue", textDecoration: "underline" }}>
              Download Keystore
            </a>
            <p style={{ marginTop: "10px", fontStyle: "italic", color: "red" }}>
              ⚠️ This file will be lost if you close this page without downloading.
            </p>
            <label style={{ display: "block", marginTop: "10px" }}>
              <input
                type="checkbox"
                checked={downloadConfirmed}
                onChange={(e) => setDownloadConfirmed(e.target.checked)}
                style={{ marginRight: "5px" }}
              />
              I have downloaded my keystore
            </label>
            <button
              onClick={() => {
                setSignerPrivateKey(generatedPrivateKey)
                onSignerReady(generatedPrivateKey)
              }}
              disabled={!downloadConfirmed}
              style={{ padding: "10px 20px", marginTop: "10px" }}
            >
              Continue to Feed Creation
            </button>
          </div>
        )}
      </div>

      <p style={{ fontWeight: "bold", color: status.startsWith("✅") ? "green" : "red" }}>{status}</p>
    </div>
  )
}
