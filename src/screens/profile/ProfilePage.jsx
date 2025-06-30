// === screens/profile/ProfilePage.jsx ===
import React, { useState } from 'react'
import { uploadFileToSwarm, uploadTextToSwarm } from '../../utils/BeeUtils'
import { uploadProfileJson } from '../../utils/ProfileUtils'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage({ beeApiUrl, selectedBatch }) {
  const [profilePic, setProfilePic] = useState(null)
  const [bio, setBio] = useState('')
  const [mood, setMood] = useState('')
  const [status, setStatus] = useState('')

  const navigate = useNavigate()

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
      const profilePicHash = await uploadFileToSwarm(beeApiUrl, selectedBatch, profilePic)

      setStatus('⏳ Uploading bio...')
      const profileHash = await uploadTextToSwarm(beeApiUrl, selectedBatch, JSON.stringify({ bio: bio }), 'bio.json')

      setStatus('⏳ Uploading mood...')
      const moodHash = await uploadTextToSwarm(beeApiUrl, selectedBatch, mood, 'mood.txt')

      setStatus('⏳ Uploading parent profile JSON...')
      const parentProfileHash = await uploadProfileJson(beeApiUrl, selectedBatch, profilePicHash, profileHash, moodHash)

     // ✅ Feed update happens here
     await updateProfileFeed(beeApiUrl, selectedBatch, signerPrivateKey, parentProfileHash)

      setStatus(`✅ Profile created successfully. Swarm Hash: ${parentProfileHash}`)

      // ✅ Optionally navigate to another screen or update feed in the next step
      // navigate('/profile-view')

    } catch (error) {
      console.error('Profile upload error:', error)
      setStatus('❌ Profile upload failed.')
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Create Your Profile</h1>

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
