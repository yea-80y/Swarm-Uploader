// === utils/ProfileUtils.js ===

import { uploadFileToSwarm, uploadTextToSwarm } from './BeeUtils'
import { updateElementFeed } from './FeedManager'

// ✅ Updates profile picture feed directly
export async function updateProfilePicture(beeApiUrl, batchId, signer, userAddress, newFile) {
  try {
    const newPicHash = await uploadFileToSwarm(beeApiUrl, batchId, newFile)

    // ✅ Directly update the 'profile-picture' feed
    await updateElementFeed(beeApiUrl, batchId, signer, 'profile-picture', newPicHash)

    console.log('✅ Profile picture updated successfully.')
    return newPicHash
  } catch (error) {
    console.error('❌ Profile picture update failed:', error)
    throw error
  }
}

// ✅ Updates bio feed directly
export async function updateBio(beeApiUrl, batchId, signer, userAddress, newBioText) {
  try {
    const bioJson = JSON.stringify({ bio: newBioText })
    const newBioHash = await uploadTextToSwarm(beeApiUrl, batchId, bioJson, 'bio.json')

    // ✅ Directly update the 'profile-bio' feed
    await updateElementFeed(beeApiUrl, batchId, signer, 'profile-bio', newBioHash)

    console.log('✅ Bio updated successfully.')
    return newBioHash
  } catch (error) {
    console.error('❌ Bio update failed:', error)
    throw error
  }
}

// ✅ Updates mood feed directly
export async function updateMood(beeApiUrl, batchId, signer, userAddress, newMoodText) {
  try {
    const moodJson = JSON.stringify({ mood: newMoodText })
    const newMoodHash = await uploadTextToSwarm(beeApiUrl, batchId, moodJson, 'mood.json')

    // ✅ Directly update the 'profile-mood' feed
    await updateElementFeed(beeApiUrl, batchId, signer, 'profile-mood', newMoodHash)

    console.log('✅ Mood updated successfully.')
    return newMoodHash
  } catch (error) {
    console.error('❌ Mood update failed:', error)
    throw error
  }
}
