// === screens/profile/ProfileViewScreen.jsx ===

import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchElementFeed } from '../../utils/FeedManager'
import { Bee } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'

export default function ProfileViewScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { beeApiUrl, signer, feedHashes } = location.state

  const [profilePicUrl, setProfilePicUrl] = useState('')
  const [bio, setBio] = useState('')
  const [mood, setMood] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const bee = new Bee(beeApiUrl)

        // ✅ Derive signer address (for reference if needed)
        const wallet = new Wallet(signer)
        const signerAddress = await wallet.getAddress()

        // ✅ Display the real feed hashes passed from ProfilePage
        console.log('✅ Profile Picture Feed Hash:', feedHashes.picture)
        console.log('✅ Bio Feed Hash:', feedHashes.bio)
        console.log('✅ Mood Feed Hash:', feedHashes.mood)

        // ✅ Fetch Profile Picture
        const picHash = await fetchElementFeed(beeApiUrl, signer, 'profile-picture')
        if (picHash) {
          setProfilePicUrl(`${beeApiUrl}/bzz/${picHash}`)
        }

        // ✅ Fetch Bio
        const bioHash = await fetchElementFeed(beeApiUrl, signer, 'profile-bio')
        if (bioHash) {
          const bioResponse = await bee.downloadData(bioHash)
          const bioText = new TextDecoder().decode(bioResponse)
          setBio(bioText)
        }

        // ✅ Fetch Mood
        const moodHash = await fetchElementFeed(beeApiUrl, signer, 'profile-mood')
        if (moodHash) {
          const moodResponse = await bee.downloadData(moodHash)
          const moodText = new TextDecoder().decode(moodResponse)
          setMood(moodText)
        }

        setStatus('✅ Profile loaded successfully.')
      } catch (error) {
        console.error('❌ Error loading profile:', error)
        setStatus('❌ Failed to load profile.')
      }
    }

    loadProfile()
  }, [beeApiUrl, signer, feedHashes])

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">User Profile</h1>

      {/* ✅ Profile Picture */}
      {profilePicUrl && (
        <div className="mb-4">
          <img src={profilePicUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover" />
        </div>
      )}

      {/* ✅ Bio */}
      <div className="mb-4">
        <h2 className="font-bold">Bio:</h2>
        <p>{bio}</p>
      </div>

      {/* ✅ Mood */}
      <div className="mb-4">
        <h2 className="font-bold">Mood:</h2>
        <p>{mood}</p>
      </div>

      {/* ✅ Display Feed Hashes */}
      <div className="mb-4">
        <h2 className="font-bold">Feed Hashes:</h2>
        <p>Profile Picture Feed Hash: {feedHashes.picture}</p>
        <p>Bio Feed Hash: {feedHashes.bio}</p>
        <p>Mood Feed Hash: {feedHashes.mood}</p>
      </div>

      {/* ✅ Edit Profile Button */}
      <button
        onClick={() => navigate('/edit-profile', { state: { beeApiUrl, signer } })}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Edit Profile
      </button>

      {/* ✅ Status Message */}
      {status && <p className="mt-4">{status}</p>}
    </div>
  )
}
