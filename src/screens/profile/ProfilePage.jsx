// === screens/profile/ProfilePage.jsx ===

// ✅ Imports React, Bee utilities, batch calculations, and feed management
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { calculateCapacity, fetchBatchTTL, formatTTL, EFFECTIVE_VOLUME_MEDIUM_MB } from '../../utils/BeeConnection'
import { useLocation } from 'react-router-dom'
import { updateProfilePicture, updateBio, updateMood } from '../../utils/ProfileUtils'

// ✅ Main ProfilePage component
export default function ProfilePage({ signer, onReset }) {
  // ✅ State variables
  const [profilePic, setProfilePic] = useState(null)
  const [bio, setBio] = useState('')
  const [mood, setMood] = useState('')
  const [status, setStatus] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batches, setBatches] = useState([])
  const [profileCreated, setProfileCreated] = useState(false)

  // ✅ Navigation and Bee API setup
  const navigate = useNavigate()
  const location = useLocation()
  const beeApiUrl = location.state?.beeApiUrl || "http://bee.swarm.public.dappnode:1633"

  console.log('✅ Bee API URL:', beeApiUrl)

  // ✅ Fetch available batches from Bee node
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await fetch(`${beeApiUrl}/stamps`)
        const data = await response.json()

        const usableBatches = await Promise.all(
          data.stamps.filter(batch => batch.usable).map(async (batch) => {
            const ttl = await fetchBatchTTL(beeApiUrl, batch.batchID)
            return {
              ...batch,
              capacity: calculateCapacity(batch.depth),
              capacityMB: EFFECTIVE_VOLUME_MEDIUM_MB[batch.depth] || 0,
              ttl: ttl
            }
          })
        )

        setBatches(usableBatches)
      } catch (err) {
        console.error('❌ Error fetching batches:', err)
        setStatus('❌ Failed to fetch live batch data.')
      }
    }

    fetchBatches()
  }, [beeApiUrl])

  // ✅ Save Profile and update Swarm feeds
  const handleSaveProfile = async () => {
    if (!selectedBatch) {
      setStatus('❌ Please select a valid batch first.')
      return
    }

    if (!profilePic || bio.trim() === '' || mood.trim() === '') {
      setStatus('❌ Please complete all fields.')
      return
    }

    try {
      setStatus('⏳ Uploading profile picture...')
      const picResult = await updateProfilePicture(beeApiUrl, selectedBatch, signer, profilePic)

      setStatus('⏳ Uploading bio...')
      const bioResult = await updateBio(beeApiUrl, selectedBatch, signer, bio)

      setStatus('⏳ Uploading mood...')
      const moodResult = await updateMood(beeApiUrl, selectedBatch, signer, mood)

      setStatus('✅ Profile created successfully.')
      setProfileCreated(true)

      // ✅ Log the real feed manifest hashes
      console.log('✅ Feed Manifest Hashes:')
      console.log('Profile Picture Feed Hash:', picResult.feedHash)
      console.log('Bio Feed Hash:', bioResult.feedHash)
      console.log('Mood Feed Hash:', moodResult.feedHash)

      // ✅ Log the real Swarm upload hashes
      console.log('✅ Swarm Hashes (Uploaded Content):')
      console.log('Profile Picture Swarm Hash:', picResult.newPicHash)
      console.log('Bio Swarm Hash:', bioResult.newBioHash)
      console.log('Mood Swarm Hash:', moodResult.newMoodHash)

    } catch (error) {
      console.error('Profile upload error:', error)
      setStatus('❌ Profile upload failed.')
    }
  }

  // ✅ Render profile creation form
  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Create Your Profile</h1>

      {/* Batch Selector */}
      <div className="mb-4">
        <label>Select Batch:</label>
        {batches.length === 0 ? (
          <p>No available batches. Please buy a batch first.</p>
        ) : (
          batches.map((batch) => (
            <div
              key={batch.batchID}
              className={`batch-card ${selectedBatch === batch.batchID ? 'selected' : ''}`}
              onClick={() => setSelectedBatch(batch.batchID)}
            >
              <strong>{batch.label || '(No Label)'}</strong><br />
              ID: {batch.batchID}<br />
              Type: {batch.immutableFlag ? 'Immutable' : 'Mutable'}<br />
              Capacity: {batch.capacity !== 'Unknown' ? batch.capacity : 'Calculating...'}<br />
              TTL: {batch.ttl !== 'Unknown' ? formatTTL(batch.ttl) : 'Calculating...'}
            </div>
          ))
        )}
      </div>

      {/* Profile Picture Input */}
      <div className="mb-4">
        <label>Profile Picture:</label>
        <input type="file" onChange={e => setProfilePic(e.target.files[0])} />
      </div>

      {/* Bio Input */}
      <div className="mb-4">
        <label>Bio (max 50 words):</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full border p-2" />
      </div>

      {/* Mood Input */}
      <div className="mb-4">
        <label>Mood (max 50 words):</label>
        <textarea value={mood} onChange={e => setMood(e.target.value)} className="w-full border p-2" />
      </div>

      {/* Save Button */}
      <button onClick={handleSaveProfile} className="bg-blue-500 text-white px-4 py-2 rounded">
        Save Profile
      </button>

      {/* Status Message */}
      {status && <p className="mt-4">{status}</p>}

      {/* View Profile Button */}
      {profileCreated && (
        <button
          onClick={() => navigate('/profile', { state: { beeApiUrl, signer } })}
          className="bg-green-500 text-white px-4 py-2 rounded mt-4"
        >
          View Profile
        </button>
      )}

      {/* Reset Signer Button */}
      <button onClick={onReset} className="bg-gray-500 text-white px-4 py-2 rounded mt-4">
        Reset Signer
      </button>
    </div>
  )
}
