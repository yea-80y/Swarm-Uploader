// === screens/profile/ProfileViewScreen.jsx ===

import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchElementFeed, getFeedHash } from '../../utils/FeedManager'
import { Bee } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'

export default function ProfileViewScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { beeApiUrl, signer } = location.state

  const [profilePicUrl, setProfilePicUrl] = useState('')
  const [bio, setBio] = useState('')
  const [mood, setMood] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const bee = new Bee(beeApiUrl)

        // ✅ Derive signer address
        const wallet = new Wallet(signer)
        const signerAddress = await wallet.getAddress()

        // ✅ Fetch Profile Picture
        const picHash = await fetchElementFeed(beeApiUrl, signer, 'profile-picture')
        console.log('✅ Profile Picture Feed Hash:', getFeedHash(signerAddress, 'profile-picture'))
        if (picHash) {
          setProfilePicUrl(`${beeApiUrl}/bzz/${picHash}`)
        }

        // ✅ Fetch Bio
        const bioHash = await fetchElementFeed(beeApiUrl, signer, 'profile-bio')
        console.log('✅ Bio Feed Hash:', getFeedHash(signerAddress, 'profile-bio'))
        if (bioHash) {
          const bioResponse = await bee.downloadData(bioHash)
          const bioText = new TextDecoder().decode(bioResponse)
          setBio(bioText)
        }

        // ✅ Fetch Mood
        const moodHash = await fetchElementFeed(beeApiUrl, signer, 'profile-mood')
        console.log('✅ Mood Feed Hash:', getFeedHash(signerAddress, 'profile-mood'))
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
  }, [beeApiUrl, signer])

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
