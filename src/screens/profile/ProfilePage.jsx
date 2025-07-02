// === screens/profile/ProfilePage.jsx ===
import React, { useState, useEffect } from 'react'
import { uploadFileToSwarm, uploadTextToSwarm } from '../../utils/BeeUtils'
import { updateElementFeed } from '../../utils/FeedManager'
import { useNavigate } from 'react-router-dom'
import { calculateCapacity, fetchBatchTTL, formatTTL, EFFECTIVE_VOLUME_MEDIUM_MB } from '../../utils/BeeConnection'
import { useLocation } from 'react-router-dom'
import { updateProfilePicture, updateBio, updateMood } from '../../utils/ProfileUtils'


export default function ProfilePage({ signer, userAddress }) {
  const [profilePic, setProfilePic] = useState(null)
  const [bio, setBio] = useState('')
  const [mood, setMood] = useState('')
  const [status, setStatus] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batches, setBatches] = useState([])

  const navigate = useNavigate()

  const location = useLocation()
  const beeApiUrl = location.state?.beeApiUrl || "http://bee.swarm.public.dappnode:1633"

  console.log('✅ Bee API URL:', beeApiUrl)

  // ✅ Fetch Batches Directly (copied from UploadScreen)
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
        await updateProfilePicture(beeApiUrl, selectedBatch, signer, userAddress, profilePic)

        setStatus('⏳ Uploading bio...')
        await updateBio(beeApiUrl, selectedBatch, signer, userAddress, bio)

        setStatus('⏳ Uploading mood...')
        await updateMood(beeApiUrl, selectedBatch, signer, userAddress, mood)

        setStatus('✅ Profile created successfully.')
    } catch (error) {
        console.error('Profile upload error:', error)
        setStatus('❌ Profile upload failed.')
    }
    }

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

      <div className="mb-4">
        <label>Profile Picture:</label>
        <input type="file" onChange={e => setProfilePic(e.target.files[0])} />
      </div>

      <div className="mb-4">
        <label>Bio (max 50 words):</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full border p-2" />
      </div>

      <div className="mb-4">
        <label>Mood (max 50 words):</label>
        <textarea value={mood} onChange={e => setMood(e.target.value)} className="w-full border p-2" />
      </div>

      <button onClick={handleSaveProfile} className="bg-blue-500 text-white px-4 py-2 rounded">
        Save Profile
      </button>

      {status && <p className="mt-4">{status}</p>}
    </div>
  )
}
