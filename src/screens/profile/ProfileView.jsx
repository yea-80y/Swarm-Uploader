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
        setStatus('⏳ Loading profile...')

        const bee = new Bee(beeApiUrl)

        // ✅ Derive signer address (for reference if needed)
        const wallet = new Wallet(signer)
        const signerAddress = await wallet.getAddress()

        // ✅ Support both flows: use passed-in hashes or fetch from feed if not provided
        const pictureHash = feedHashes?.picture || await fetchElementFeed(beeApiUrl, signer, 'profile-picture')
        const bioHash = feedHashes?.bio || await fetchElementFeed(beeApiUrl, signer, 'profile-bio')
        const moodHash = feedHashes?.mood || await fetchElementFeed(beeApiUrl, signer, 'profile-mood')

        // ✅ Log resolved feed hashes (whether passed or fetched)
        console.log('✅ Resolved Feed Manifest Hashes:')
        console.log('Profile Picture Feed Hash:', pictureHash)
        console.log('Bio Feed Hash:', bioHash)
        console.log('Mood Feed Hash:', moodHash)

        // ✅ Load and set profile picture
        if (pictureHash) {
          setProfilePicUrl(`${beeApiUrl}/bzz/${pictureHash}`)
        }

        // ✅ Load and set bio
        if (bioHash) {
          const response = await fetch(`${beeApiUrl}/bzz/${bioHash}`)
          const text = await response.text()
          setBio(text)
        }

        // ✅ Load and set mood
        if (moodHash) {
          const response = await fetch(`${beeApiUrl}/bzz/${moodHash}`)
          const text = await response.text()
          setMood(text)
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
          <img src={profilePicUrl} alt="Profile" className="mx-auto rounded-full object-cover border shadow" style={{ width: '160px', height: '160px', maxWidth: '100%', maxHeight: '160px' }} />
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