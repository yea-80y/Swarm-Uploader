// === screens/profile/ProfileEditScreen.jsx ===

import React, { useState } from 'react'
import { updateProfilePicture, updateBio, updateMood } from '../../utils/ProfileUtils'
import { useSigner } from '../../context/SignerContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function ProfileEditScreen({ beeApiUrl, selectedBatch, userAddress }) {
  const { signerPrivateKey } = useSigner()
  const [newProfilePic, setNewProfilePic] = useState(null)
  const [newBio, setNewBio] = useState('')
  const [newMood, setNewMood] = useState('')
  const [status, setStatus] = useState('')

  const navigate = useNavigate()

  const handleProfilePicUpdate = async () => {
    if (!newProfilePic) return
    try {
      setStatus('⏳ Updating profile picture...')
      await updateProfilePicture(beeApiUrl, selectedBatch, signerPrivateKey, userAddress, newProfilePic)
      setStatus('✅ Profile picture updated successfully.')
    } catch (error) {
      setStatus('❌ Failed to update profile picture.')
    }
  }

  const handleBioUpdate = async () => {
    if (!newBio.trim()) return
    try {
      setStatus('⏳ Updating bio...')
      await updateBio(beeApiUrl, selectedBatch, signerPrivateKey, userAddress, newBio)
      setStatus('✅ Bio updated successfully.')
    } catch (error) {
      setStatus('❌ Failed to update bio.')
    }
  }

  const handleMoodUpdate = async () => {
    if (!newMood.trim()) return
    try {
      setStatus('⏳ Updating mood...')
      await updateMood(beeApiUrl, selectedBatch, signerPrivateKey, userAddress, newMood)
      setStatus('✅ Mood updated successfully.')
    } catch (error) {
      setStatus('❌ Failed to update mood.')
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Edit Your Profile</h1>

      {/* Profile Picture Update */}
      <div className="mb-4">
        <label>Change Profile Picture:</label>
        <input type="file" onChange={e => setNewProfilePic(e.target.files[0])} />
        <button onClick={handleProfilePicUpdate} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
          Save New Picture
        </button>
      </div>

      {/* Bio Update */}
      <div className="mb-4">
        <label>Edit Bio:</label>
        <textarea
          value={newBio}
          onChange={e => setNewBio(e.target.value)}
          className="w-full border p-2"
        />
        <button onClick={handleBioUpdate} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
          Save New Bio
        </button>
      </div>

      {/* Mood Update */}
      <div className="mb-4">
        <label>Update Mood:</label>
        <textarea
          value={newMood}
          onChange={e => setNewMood(e.target.value)}
          className="w-full border p-2"
        />
        <button onClick={handleMoodUpdate} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
          Save New Mood
        </button>
      </div>

      {/* Navigation */}
      <button onClick={() => navigate('/')} className="bg-gray-500 text-white px-4 py-2 rounded mt-4">
        Back to Home
      </button>

      {status && <p className="mt-4">{status}</p>}
    </div>
  )
}
