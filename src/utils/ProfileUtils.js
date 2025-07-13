// === utils/ProfileUtils.js ===

import { Bee, Topic } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'
import { updateElementFeed } from './FeedManager'

// ✅ Ensure batch ID is correctly formatted
function formatBatchId(batchId) {
  return batchId.startsWith('0x') ? batchId : '0x' + batchId
}

// ✅ Retrieve signer public address
async function getSignerAddress(signer) {
  const wallet = new Wallet(signer)
  return await wallet.getAddress()
}

// ✅ Create Feed Manifest
async function createFeedIfNotExists(beeApiUrl, batchId, feedName, signer) {
  const bee = new Bee(beeApiUrl)
  const topic = Topic.fromString(feedName)
  const batchIdHex = batchId.startsWith('0x') ? batchId : '0x' + batchId
  const signerWallet = new Wallet(signer)
  const signerAddress = await signerWallet.getAddress()

  console.log(`✅ Creating feed manifest for: ${feedName}`)
  const manifestResponse = await bee.createFeedManifest(batchIdHex, topic, signerAddress)
  console.log("📦 manifestResponse:", manifestResponse)
  console.log("📦 reference:", manifestResponse.reference)

  const feedHash = manifestResponse.toHex()
  console.log(`✅ Feed hash (Swarm hash): ${feedHash}`)

  // ✅ Try to fetch the current content of the feed (like your working flow)
  try {
    const reader = bee.makeFeedReader(topic, signerAddress)
    const current = await reader.downloadData()
    console.log(`✅ Current content of ${feedName}: ${current}`)
  } catch {
    console.log(`ℹ️ No current content for ${feedName}`)
  }

  return feedHash
}

// ✅ Upload File to Swarm
async function uploadFileToSwarm(beeApiUrl, batchId, file) {
  const bee = new Bee(beeApiUrl)
  const batchIdHex = formatBatchId(batchId)

  console.log('✅ Uploading file to Swarm...')

  const result = await bee.uploadFile(batchIdHex, file)
  console.log('✅ File uploaded to Swarm. Swarm hash:', result.reference.toString())

  return result.reference.toString()
}

// ✅ Upload Text to Swarm
export async function uploadTextToSwarm(text, batchId, beeApiUrl) {
  try {
    const blob = new Blob([text], { type: 'text/plain' });
    const response = await fetch(`${beeApiUrl}/bzz`, {
      method: 'POST',
      headers: {
        'Swarm-Postage-Batch-Id': batchId,
      },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`Text upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.reference; // Swarm hash
  } catch (error) {
    console.error('Error uploading text to Swarm:', error);
    throw error;
  }
}

// ✅ Profile Element Uploads

export async function updateProfilePicture(beeApiUrl, batchId, signer, newFile) {
  try {
    const feedHash = await createFeedIfNotExists(beeApiUrl, batchId, 'profile-picture', signer)

    const newPicHash = await uploadFileToSwarm(beeApiUrl, batchId, newFile)
    await updateElementFeed(beeApiUrl, batchId, signer, 'profile-picture', newPicHash)

    console.log('✅ Profile picture updated successfully.')
    return { feedHash, newPicHash }
  } catch (error) {
    console.error('❌ Error updating profile picture:', error)
    throw error
  }
}

export async function updateBio(beeApiUrl, batchId, signer, bioText) {
  try {
    const feedHash = await createFeedIfNotExists(beeApiUrl, batchId, 'profile-bio', signer)

    const newBioHash = await uploadTextToSwarm(bioText, batchId, beeApiUrl)
    await updateElementFeed(beeApiUrl, batchId, signer, 'profile-bio', newBioHash)

    console.log('✅ Bio updated successfully.')
    return { feedHash, newBioHash }
  } catch (error) {
    console.error('❌ Error updating bio:', error)
    throw error
  }
}

export async function updateMood(beeApiUrl, batchId, signer, moodText) {
  try {
    const feedHash = await createFeedIfNotExists(beeApiUrl, batchId, 'profile-mood', signer)

    const newMoodHash = await uploadTextToSwarm(moodText, batchId, beeApiUrl)
    await updateElementFeed(beeApiUrl, batchId, signer, 'profile-mood', newMoodHash)

    console.log('✅ Mood updated successfully.')
    return { feedHash, newMoodHash }
  } catch (error) {
    console.error('❌ Error updating mood:', error)
    throw error
  }
}
