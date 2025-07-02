// === screens/profile/ProfileViewScreen.jsx ===

import React, { useEffect, useState } from 'react'
import { Bee } from '@ethersphere/bee-js'
import { fetchElementFeed } from '../../utils/FeedManager'
import { useNavigate } from 'react-router-dom'

export default function ProfileViewScreen({ beeApiUrl, userAddress }) {
  const [profilePicUrl, setProfilePicUrl] = useState('')
  const [bio, setBio] = useState('')
  const [mood, setMood] = useState('')
  const [status, setStatus] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const bee = new Bee(beeApiUrl)

        // Fetch profile picture feed
        const picHash = await fetchElementFeed(beeApiUrl, userAddress, 'profile-picture')
        if (picHash) setProfilePicUrl(`${beeApiUrl}/bzz/${picHash}`)

        // Fetch bio feed
        const bioHash = await fetchElementFeed(beeApiUrl, userAddress, 'profile-bio')
        if (bioHash) {
          const bioResponse = await bee.downloadData(bioHash)
          const bioJson = JSON.parse(new TextDecoder().decode(bioResponse))
          setBio(bioJson.bio)
        }

        // Fetch mood feed
        const moodHash = await fetchElementFeed(beeApiUrl, userAddress, 'profile-mood')
        if (moodHash) {
          const moodResponse = await bee.downloadData(moodHash)
          const moodJson = JSON.parse(new TextDecoder().decode(moodResponse))
          setMood(moodJson.mood)
        }

        setStatus('✅ Profile loaded successfully.')
      } catch (error) {
        console.error('❌ Error loading profile:', error)
        setStatus('❌ Failed to load profile.')
      }
    }

    loadProfile()
  }, [beeApiUrl, userAddress])

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">User Profile</h1>

      {profilePicUrl && (
        <div className="mb-4">
          <img src={profilePicUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover" />
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-bold">Bio:</h2>
        <p>{bio}</p>
      </div>

      <div className="mb-4">
        <h2 className="font-bold">Mood:</h2>
        <p>{mood}</p>
      </div>

      <button
        onClick={() => navigate('/edit-profile')}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Edit Profile
      </button>

      {status && <p className="mt-4">{status}</p>}
    </div>
  )
}
